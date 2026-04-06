import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path, G } from 'react-native-svg';

import { supabase } from '../../lib/supabase';
import {
  getMyLatestAvatarJob,
  getMyAvatarVariants,
  getUnlockedPieceIndexes,
  unlockPuzzlePiece,
  getFlameStats,
  markVariantCompleted,
} from '../../services/puzzle';
import styles from './PuzzleScreen.styles';

function getPublicUrl(bucket, path) {
  if (!bucket || !path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function scaleSvgPath(path, scaleX, scaleY) {
  if (!path) return '';

  return path.replace(
    /([MLC])\s*(-?\d+(\.\d+)?)\s*(-?\d+(\.\d+)?)(?:,\s*(-?\d+(\.\d+)?)\s*(-?\d+(\.\d+)?))?(?:,\s*(-?\d+(\.\d+)?)\s*(-?\d+(\.\d+)?))?/g,
    (match, cmd, x1, _a, y1, _b, x2, _c, y2, _d, x3, _e, y3) => {
      if (cmd === 'M' || cmd === 'L') {
        return `${cmd} ${(Number(x1) * scaleX).toFixed(2)} ${(Number(y1) * scaleY).toFixed(2)}`;
      }

      if (cmd === 'C') {
        return `${cmd} ${(Number(x1) * scaleX).toFixed(2)} ${(Number(y1) * scaleY).toFixed(2)}, ${(Number(x2) * scaleX).toFixed(2)} ${(Number(y2) * scaleY).toFixed(2)}, ${(Number(x3) * scaleX).toFixed(2)} ${(Number(y3) * scaleY).toFixed(2)}`;
      }

      return match;
    }
  );
}

function VariantTitle({ variant, index, total }) {
  return (
    <View style={styles.navCenter}>
      <Text style={styles.navTitle} numberOfLines={2}>
        {variant?.prompt || `Variant ${index + 1}`}
      </Text>
      <Text style={styles.navMeta}>
        Варіант {index + 1} з {total}
      </Text>
    </View>
  );
}

export default function PuzzleScreen() {
  const queryClient = useQueryClient();

  const [activeIndex, setActiveIndex] = useState(0);
  const [boardWidth, setBoardWidth] = useState(340);

  const latestJobQuery = useQuery({
    queryKey: ['my_avatar_job'],
    queryFn: getMyLatestAvatarJob,
    refetchInterval: 5000,
  });

  const variantsQuery = useQuery({
    queryKey: ['avatar_variants', latestJobQuery.data?.id],
    queryFn: () => getMyAvatarVariants(latestJobQuery.data?.id),
    enabled: !!latestJobQuery.data?.id,
    refetchInterval: 5000,
  });

  const flameStatsQuery = useQuery({
    queryKey: ['flame_stats'],
    queryFn: getFlameStats,
    refetchInterval: 5000,
  });

  const variants = variantsQuery.data || [];
  const activeVariant = variants[activeIndex] || null;

  const unlocksQuery = useQuery({
    queryKey: ['avatar_puzzle_unlocks', activeVariant?.id],
    queryFn: () => getUnlockedPieceIndexes(activeVariant?.id),
    enabled: !!activeVariant?.id,
    refetchInterval: 4000,
  });

  useEffect(() => {
    if (!variants.length) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex > variants.length - 1) {
      setActiveIndex(0);
    }
  }, [variants.length, activeIndex]);

  const unlockMutation = useMutation({
    mutationFn: unlockPuzzlePiece,
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['avatar_puzzle_unlocks'] });
      queryClient.invalidateQueries({ queryKey: ['flame_stats'] });
      queryClient.invalidateQueries({ queryKey: ['avatar_variants'] });

      if (result?.completed) {
        queryClient.invalidateQueries({ queryKey: ['my_profile'] });
        Alert.alert('Готово', 'Пазл повністю відкрито');
      }
    },
    onError: (error) => {
      Alert.alert('Помилка', error.message || 'Не вдалося відкрити частину пазла');
    },
  });

  const completeMutation = useMutation({
    mutationFn: markVariantCompleted,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_profile'] });
      queryClient.invalidateQueries({ queryKey: ['avatar_variants'] });
    },
  });

  const unlockedIndexes = unlocksQuery.data || [];
  const unlockedSet = useMemo(() => new Set(unlockedIndexes), [unlockedIndexes]);

  const flames = flameStatsQuery.data?.available || 0;
  const earned = flameStatsQuery.data?.earned || 0;
  const spent = flameStatsQuery.data?.spent || 0;

  const manifest = activeVariant?.piece_manifest || [];
  const totalPieces = activeVariant?.pieces_count || manifest.length || 30;
  const openedPieces = unlockedSet.size;
  const isComplete = openedPieces >= totalPieces;

  const boardAspectRatio = useMemo(() => {
    const width = activeVariant?.image_width || 1;
    const height = activeVariant?.image_height || 1;
    return width / height;
  }, [activeVariant?.image_width, activeVariant?.image_height]);

  const boardHeight = useMemo(() => {
    return Math.round(boardWidth / boardAspectRatio);
  }, [boardWidth, boardAspectRatio]);

  const generatedImageUrl = useMemo(() => {
    if (!activeVariant?.generated_path) return null;
    return getPublicUrl('avatar_generated', activeVariant.generated_path);
  }, [activeVariant?.generated_path]);

  const pieceBucket = activeVariant?.pieces_bucket || 'avatar-puzzle-pieces';

  useEffect(() => {
    if (!activeVariant || !generatedImageUrl || !isComplete || activeVariant.is_completed) {
      return;
    }

    completeMutation.mutate({
      variantId: activeVariant.id,
      generatedPath: activeVariant.generated_path,
      generatedUrl: generatedImageUrl,
    });
  }, [activeVariant, generatedImageUrl, isComplete, completeMutation]);

  async function handleUnlock(pieceIndex) {
    if (!activeVariant) return;
    if (unlockMutation.isPending) return;
    if (unlockedSet.has(pieceIndex)) return;

    if (flames <= 0) {
      Alert.alert('Недостатньо вогників', 'Спочатку виконай звички та зароби вогники.');
      return;
    }

    await unlockMutation.mutateAsync({
      variantId: activeVariant.id,
      pieceIndex,
    });
  }

  async function onDownload() {
    if (!isComplete || !generatedImageUrl) {
      Alert.alert('Поки не можна', 'Спочатку відкрий увесь пазл.');
      return;
    }

    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const link = document.createElement('a');
        link.href = generatedImageUrl;
        link.download = `avatar_${activeVariant?.idx ?? 0}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      await Linking.openURL(generatedImageUrl);
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося завантажити зображення');
    }
  }

  const goPrev = () => setActiveIndex((p) => Math.max(0, p - 1));
  const goNext = () => setActiveIndex((p) => Math.min(variants.length - 1, p + 1));

  if (latestJobQuery.isLoading || variantsQuery.isLoading || flameStatsQuery.isLoading) {
    return (
      <LinearGradient colors={['#0B1020', '#0F172A', '#111827']} style={styles.gradient}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#67A8FF" />
        </View>
      </LinearGradient>
    );
  }

  if (!latestJobQuery.data) {
    return (
      <LinearGradient colors={['#0B1020', '#0F172A', '#111827']} style={styles.gradient}>
        <View style={styles.emptyWrap}>
          <Text style={styles.kicker}>PUZZLE</Text>
          <Text style={styles.title}>Puzzle</Text>
          <Text style={styles.emptyText}>
            Ще немає задачі на AI-пазли. Завантаж аватар у Profile.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  if (!variants.length) {
    const job = latestJobQuery.data;
    return (
      <LinearGradient colors={['#0B1020', '#0F172A', '#111827']} style={styles.gradient}>
        <View style={styles.emptyWrap}>
          <Text style={styles.kicker}>PUZZLE</Text>
          <Text style={styles.title}>Puzzle</Text>
          <Text style={styles.emptyText}>AI-зображення ще генеруються.</Text>
          <Text style={styles.emptyText}>
            Статус: {job.status} · {job.progress_percent ?? 0}%
          </Text>
          {!!job.progress_stage && (
            <Text style={styles.emptyText}>Етап: {job.progress_stage}</Text>
          )}
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0B1020', '#0F172A', '#111827']} style={styles.gradient}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.kicker}>PUZZLE</Text>

          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Puzzle</Text>
              <Text style={styles.subtitle}>
                Відкривай частини за вогники. Після повного відкриття можна завантажити AI-аватар.
              </Text>
            </View>

            <View style={styles.flameBadge}>
              <Ionicons name="flame" size={16} color="#FFB347" />
              <Text style={styles.flameBadgeText}>{flames}</Text>
            </View>
          </View>

          <View style={styles.navRow}>
            <Pressable
              onPress={goPrev}
              disabled={activeIndex <= 0}
              style={[styles.navButton, activeIndex <= 0 && styles.navButtonDisabled]}
            >
              <Ionicons name="chevron-back" size={18} color="#DCEBFF" />
            </Pressable>

            <VariantTitle variant={activeVariant} index={activeIndex} total={variants.length} />

            <Pressable
              onPress={goNext}
              disabled={activeIndex >= variants.length - 1}
              style={[styles.navButton, activeIndex >= variants.length - 1 && styles.navButtonDisabled]}
            >
              <Ionicons name="chevron-forward" size={18} color="#DCEBFF" />
            </Pressable>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Відкрито</Text>
              <Text style={styles.statValue}>{openedPieces}/{totalPieces}</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Зароблено</Text>
              <Text style={styles.statValue}>{earned}</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Витрачено</Text>
              <Text style={styles.statValue}>{spent}</Text>
            </View>
          </View>

          <View
            style={styles.boardOuter}
            onLayout={(e) => {
              const width = e.nativeEvent.layout.width;
              const nextWidth = clamp(width - 20, 280, 620);
              if (Math.abs(nextWidth - boardWidth) > 2) {
                setBoardWidth(nextWidth);
              }
            }}
          >
            <View style={styles.boardFrame}>
              <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                style={styles.boardGradient}
              >
                <View
                  style={[
                    styles.board,
                    {
                      width: boardWidth,
                      height: boardHeight,
                    },
                  ]}
                >
                  {generatedImageUrl ? (
                    <Image
                      source={{ uri: generatedImageUrl }}
                      style={{
                        position: 'absolute',
                        width: boardWidth,
                        height: boardHeight,
                        opacity: 0.12,
                      }}
                      resizeMode="cover"
                    />
                  ) : null}

                  {unlocksQuery.isLoading ? (
                    <View style={styles.unlocksLoader}>
                      <ActivityIndicator size="large" color="#67A8FF" />
                    </View>
                  ) : (
                    manifest.map((piece) => {
                      const unlocked = unlockedSet.has(piece.index);
                      const pieceUrl = getPublicUrl(pieceBucket, piece.file);

                      const scaleX = boardWidth / activeVariant.image_width;
                      const scaleY = boardHeight / activeVariant.image_height;

                      const pieceLeft = (piece.slotX - piece.offsetX) * scaleX;
                      const pieceTop = (piece.slotY - piece.offsetY) * scaleY;

                      const pieceWidth = piece.pieceWidth * scaleX;
                      const pieceHeight = piece.pieceHeight * scaleY;

                      const scaledPath = scaleSvgPath(piece.path, scaleX, scaleY);

                      const slotLeft = piece.slotX * scaleX;
                      const slotTop = piece.slotY * scaleY;
                      const slotWidth = piece.slotWidth * scaleX;
                      const slotHeight = piece.slotHeight * scaleY;

                      return (
                        <View key={piece.index}>
                          {unlocked && pieceUrl ? (
                            <Image
                              source={{ uri: pieceUrl }}
                              resizeMode="contain"
                              style={[
                                styles.pieceSvg,
                                Platform.OS !== 'web' && styles.pieceShadowNative,
                                {
                                  left: pieceLeft,
                                  top: pieceTop,
                                  width: pieceWidth,
                                  height: pieceHeight,
                                },
                              ]}
                            />
                          ) : (
                            <Pressable
                              onPress={() => handleUnlock(piece.index)}
                              style={[
                                styles.piecePressable,
                                {
                                  left: pieceLeft,
                                  top: pieceTop,
                                  width: pieceWidth,
                                  height: pieceHeight,
                                },
                              ]}
                            >
                              <Svg
                                width={pieceWidth}
                                height={pieceHeight}
                                viewBox={`0 0 ${pieceWidth} ${pieceHeight}`}
                                style={styles.pieceSvg}
                              >
                                <G>
                                  <Path
                                    d={scaledPath}
                                    fill="rgba(8,18,40,0.90)"
                                    stroke="rgba(180,210,255,0.16)"
                                    strokeWidth={1.5}
                                  />
                                </G>
                              </Svg>

                              <View
                                style={[
                                  styles.lockBadge,
                                  {
                                    left: slotWidth / 2 - 23,
                                    top: slotHeight / 2 - 20,
                                  },
                                ]}
                                pointerEvents="none"
                              >
                                <View style={styles.badgeInner}>
                                  <Ionicons name="lock-closed-outline" size={14} color="#DCEBFF" />
                                  <Text style={styles.pieceLockedText}>1 🔥</Text>
                                </View>
                              </View>
                            </Pressable>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              </LinearGradient>
            </View>
          </View>

          <Pressable
            onPress={onDownload}
            disabled={!isComplete}
            style={[
              styles.downloadButton,
              !isComplete && styles.navButtonDisabled,
            ]}
          >
            <Text style={styles.downloadButtonText}>Завантажити готовий аватар</Text>
          </Pressable>

          <View style={styles.bottomVariantsRow}>
            {variants.map((variant, index) => {
              const selected = index === activeIndex;
              return (
                <Pressable
                  key={variant.id}
                  onPress={() => setActiveIndex(index)}
                  style={[
                    styles.variantBtn,
                    selected && styles.variantBtnActive,
                  ]}
                >
                  <Text style={styles.variantBtnText}>{index + 1}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}