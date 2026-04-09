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
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path, G } from 'react-native-svg';

import {
  getFreeCatalogPuzzles,
  getUnlockedPieceIndexes,
  unlockPuzzlePiece,
  getFlameStats,
  getPremiumStubState,
  getPublicImageUrl,
} from '../../services/puzzle';
import {
  createPremiumAvatarJob,
  getMyLatestPremiumJob,
  getMyPremiumGenerationLimit,
} from '../../services/premiumGeneration';
import { uploadPremiumSourceImage } from '../../services/premiumStorage';
import styles from './PuzzleScreen.styles';

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

function formatDateTime(value) {
  if (!value) return '—';

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleString();
}

function buildRemainingText(nextAllowedAt) {
  if (!nextAllowedAt) return null;

  const now = new Date();
  const next = new Date(nextAllowedAt);

  if (Number.isNaN(next.getTime()) || next <= now) {
    return 'Можна генерувати зараз';
  }

  const diffMs = next.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return `Наступна генерація буде доступна приблизно через ${diffDays} дн.`;
}

function PuzzleTabs({ value, onChange }) {
  return (
    <View style={styles.tabsWrap}>
      <Pressable
        onPress={() => onChange('free')}
        style={[styles.tabButton, value === 'free' && styles.tabButtonActive]}
      >
        <Text style={[styles.tabButtonText, value === 'free' && styles.tabButtonTextActive]}>
          Безкоштовні
        </Text>
      </Pressable>

      <Pressable
        onPress={() => onChange('premium')}
        style={[styles.tabButton, value === 'premium' && styles.tabButtonActive]}
      >
        <Text style={[styles.tabButtonText, value === 'premium' && styles.tabButtonTextActive]}>
          Преміум
        </Text>
      </Pressable>
    </View>
  );
}

function VariantTitle({ variant, index, total }) {
  return (
    <View style={styles.navCenter}>
      <Text style={styles.navTitle} numberOfLines={2}>
        {variant?.display_title || variant?.prompt || `Пазл ${index + 1}`}
      </Text>
      <Text style={styles.navMeta}>
        {index + 1} з {total}
      </Text>
    </View>
  );
}

export default function PuzzleScreen() {
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('free');
  const [activeIndex, setActiveIndex] = useState(0);
  const [boardWidth, setBoardWidth] = useState(340);

  const [premiumPrompt, setPremiumPrompt] = useState('');
  const [premiumAsset, setPremiumAsset] = useState(null);
  const [premiumSourcePath, setPremiumSourcePath] = useState(null);
  const [uploadingPremiumSource, setUploadingPremiumSource] = useState(false);

  const freePuzzlesQuery = useQuery({
    queryKey: ['free_catalog_puzzles'],
    queryFn: getFreeCatalogPuzzles,
    refetchInterval: 15000,
  });

  const flameStatsQuery = useQuery({
    queryKey: ['flame_stats'],
    queryFn: getFlameStats,
    refetchInterval: 5000,
  });

  const premiumStubQuery = useQuery({
    queryKey: ['premium_stub_state'],
    queryFn: getPremiumStubState,
    refetchInterval: 15000,
  });

  const latestPremiumJobQuery = useQuery({
    queryKey: ['latest_premium_job'],
    queryFn: getMyLatestPremiumJob,
    refetchInterval: 6000,
  });

  const premiumLimitQuery = useQuery({
    queryKey: ['premium_generation_limit'],
    queryFn: getMyPremiumGenerationLimit,
    refetchInterval: 15000,
  });

  const variants = freePuzzlesQuery.data || [];
  const activeVariant = variants[activeIndex] || null;

  const unlocksQuery = useQuery({
    queryKey: ['avatar_puzzle_unlocks', activeVariant?.id],
    queryFn: () => getUnlockedPieceIndexes(activeVariant?.id),
    enabled: tab === 'free' && !!activeVariant?.id,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar_puzzle_unlocks'] });
      queryClient.invalidateQueries({ queryKey: ['flame_stats'] });
    },
    onError: (error) => {
      Alert.alert('Помилка', error.message || 'Не вдалося відкрити частину пазла');
    },
  });

  const createPremiumJobMutation = useMutation({
    mutationFn: createPremiumAvatarJob,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['latest_premium_job'] });
      queryClient.invalidateQueries({ queryKey: ['premium_generation_limit'] });

      Alert.alert(
        'Готово',
        data?.nextAllowedAt
          ? `Premium job створено. Наступна генерація буде доступна після ${formatDateTime(
              data.nextAllowedAt
            )}.`
          : 'Premium job створено'
      );
    },
    onError: (error) => {
      Alert.alert('Помилка', error.message || 'Не вдалося створити premium job');
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
    return getPublicImageUrl(
      activeVariant.preview_bucket || 'avatar_generated',
      activeVariant.preview_path || activeVariant.generated_path
    );
  }, [activeVariant]);

  const pieceBucket = activeVariant?.pieces_bucket || 'avatar-puzzle-pieces';

  const premiumState = premiumStubQuery.data || {
    isPremium: false,
    premiumExpiresAt: null,
    premiumPlan: 'premium_monthly',
  };

  const latestPremiumJob = latestPremiumJobQuery.data || null;
  const premiumLimit = premiumLimitQuery.data || null;
  const premiumRemainingText = buildRemainingText(premiumLimit?.next_allowed_at);

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
        link.download = `free_puzzle_${activeVariant?.idx ?? 0}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      await Linking.openURL(generatedImageUrl);
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося відкрити зображення');
    }
  }

  async function handlePickPremiumImage() {
    try {
      if (Platform.OS !== 'web') {
        const permissionResult =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
          Alert.alert('Немає доступу', 'Дозволь доступ до галереї');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.95,
        base64: Platform.OS !== 'web',
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      setPremiumAsset(asset);
      setPremiumSourcePath(null);
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося вибрати фото');
    }
  }

  async function handleCreatePremiumJob() {
    try {
      if (!premiumState.isPremium) {
        Alert.alert('Premium locked', 'Спочатку активуй premium підписку.');
        return;
      }

      const prompt = premiumPrompt.trim();

      if (!prompt) {
        Alert.alert('Помилка', 'Введи prompt для генерації');
        return;
      }

      if (!premiumAsset) {
        Alert.alert('Помилка', 'Спочатку вибери фото');
        return;
      }

      if (premiumLimit?.next_allowed_at) {
        const next = new Date(premiumLimit.next_allowed_at);
        const now = new Date();

        if (!Number.isNaN(next.getTime()) && next > now) {
          Alert.alert(
            'Поки не можна',
            `Наступна генерація буде доступна після ${formatDateTime(
              premiumLimit.next_allowed_at
            )}`
          );
          return;
        }
      }

      setUploadingPremiumSource(true);

      const uploadResult = await uploadPremiumSourceImage(premiumAsset);
      setPremiumSourcePath(uploadResult.storagePath);

      await createPremiumJobMutation.mutateAsync({
        sourceImagePath: uploadResult.storagePath,
        prompt,
      });
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося створити premium job');
    } finally {
      setUploadingPremiumSource(false);
    }
  }

  const goPrev = () => setActiveIndex((p) => Math.max(0, p - 1));
  const goNext = () => setActiveIndex((p) => Math.min(variants.length - 1, p + 1));

  if (
    freePuzzlesQuery.isLoading ||
    flameStatsQuery.isLoading ||
    premiumStubQuery.isLoading ||
    latestPremiumJobQuery.isLoading ||
    premiumLimitQuery.isLoading
  ) {
    return (
      <LinearGradient colors={['#0B1020', '#0F172A', '#111827']} style={styles.gradient}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#67A8FF" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0B1020', '#0F172A', '#111827']} style={styles.gradient}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.kicker}>PUZZLES</Text>

          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Puzzles</Text>
              <Text style={styles.subtitle}>
                Безкоштовні пазли відкриваються за вогники. Premium генерує 5 AI-пазлів із твого фото.
              </Text>
            </View>

            <View style={styles.flameBadge}>
              <Ionicons name="flame" size={16} color="#FFB347" />
              <Text style={styles.flameBadgeText}>{flames}</Text>
            </View>
          </View>

          <PuzzleTabs value={tab} onChange={setTab} />

          {tab === 'premium' ? (
            <>
              {!premiumState.isPremium ? (
                <View style={styles.paywallCard}>
                  <View style={styles.paywallHeader}>
                    <Ionicons name="diamond-outline" size={20} color="#C4B5FD" />
                    <Text style={styles.paywallTitle}>Premium puzzles</Text>
                  </View>

                  <Text style={styles.paywallText}>
                    Premium ще не купується з цього екрана, але backend уже готовий.
                  </Text>
                  <Text style={styles.paywallText}>
                    Після активації premium тут можна:
                  </Text>
                  <Text style={styles.paywallBullet}>• завантажити своє фото</Text>
                  <Text style={styles.paywallBullet}>• ввести власний prompt</Text>
                  <Text style={styles.paywallBullet}>• згенерувати 5 AI-пазлів</Text>
                  <Text style={styles.paywallBullet}>• оновлювати генерацію раз на місяць</Text>

                  <View style={styles.paywallStatusBox}>
                    <Text style={styles.paywallStatusLabel}>Статус</Text>
                    <Text style={styles.paywallStatusValue}>Locked</Text>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.premiumCard}>
                    <View style={styles.premiumHeaderRow}>
                      <Text style={styles.premiumCardTitle}>Створити premium job</Text>
                      <View style={styles.premiumBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#86EFAC" />
                        <Text style={styles.premiumBadgeText}>Premium active</Text>
                      </View>
                    </View>

                    <Text style={styles.premiumInfoText}>
                      Підписка активна до: {formatDateTime(premiumState.premiumExpiresAt)}
                    </Text>

                    <Text style={styles.label}>Prompt</Text>
                    <TextInput
                      value={premiumPrompt}
                      onChangeText={setPremiumPrompt}
                      placeholder="Наприклад: futuristic portrait, blue neon, cinematic light"
                      placeholderTextColor="#6F829F"
                      multiline
                      textAlignVertical="top"
                      style={styles.promptInput}
                    />

                    <View style={styles.premiumButtonsRow}>
                      <Pressable
                        style={styles.secondaryActionButton}
                        onPress={handlePickPremiumImage}
                        disabled={uploadingPremiumSource || createPremiumJobMutation.isPending}
                      >
                        <Ionicons name="image-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.secondaryActionButtonText}>Вибрати фото</Text>
                      </Pressable>

                      <Pressable
                        style={styles.primaryActionButton}
                        onPress={handleCreatePremiumJob}
                        disabled={uploadingPremiumSource || createPremiumJobMutation.isPending}
                      >
                        {uploadingPremiumSource || createPremiumJobMutation.isPending ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.primaryActionButtonText}>Generate 5</Text>
                          </>
                        )}
                      </Pressable>
                    </View>

                    {premiumAsset?.uri ? (
                      <View style={styles.selectedImageWrap}>
                        <Image source={{ uri: premiumAsset.uri }} style={styles.selectedImage} />
                        <View style={styles.selectedImageMeta}>
                          <Text style={styles.selectedImageTitle}>Вибране фото</Text>
                          <Text style={styles.selectedImageText}>
                            {premiumSourcePath ? 'Фото завантажено в storage' : 'Готове до upload'}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.selectedImagePlaceholder}>
                        <Ionicons name="image-outline" size={20} color="#8EA4C8" />
                        <Text style={styles.selectedImagePlaceholderText}>
                          Фото ще не вибране
                        </Text>
                      </View>
                    )}

                    <View style={styles.cooldownBox}>
                      <Text style={styles.cooldownLabel}>Cooldown</Text>
                      <Text style={styles.cooldownValue}>
                        {premiumRemainingText || 'Ще не використовувалось'}
                      </Text>
                      {!!premiumLimit?.next_allowed_at && (
                        <Text style={styles.cooldownMeta}>
                          Наступна дата: {formatDateTime(premiumLimit.next_allowed_at)}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.premiumCard}>
                    <Text style={styles.premiumCardTitle}>Останній premium job</Text>

                    {latestPremiumJob ? (
                      <View style={styles.jobInfoWrap}>
                        <Text style={styles.jobInfoLine}>Статус: {latestPremiumJob.status}</Text>
                        <Text style={styles.jobInfoLine}>
                          Прогрес: {latestPremiumJob.progress_percent ?? 0}%
                        </Text>
                        <Text style={styles.jobInfoLine}>
                          Варіантів: {latestPremiumJob.variants_to_generate ?? 5}
                        </Text>
                        {!!latestPremiumJob.progress_stage && (
                          <Text style={styles.jobInfoLine}>
                            Етап: {latestPremiumJob.progress_stage}
                          </Text>
                        )}
                        {!!latestPremiumJob.prompt && (
                          <Text style={styles.jobPrompt}>Prompt: {latestPremiumJob.prompt}</Text>
                        )}
                        {!!latestPremiumJob.error_text && (
                          <Text style={styles.jobErrorText}>
                            Помилка: {latestPremiumJob.error_text}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>Ще немає premium job</Text>
                    )}
                  </View>
                </>
              )}
            </>
          ) : (
            <>
              {!variants.length ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>
                    У каталозі ще немає безкоштовних пазлів. Спочатку додай catalog rows у БД.
                  </Text>
                </View>
              ) : (
                <>
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
                              const pieceUrl = getPublicImageUrl(pieceBucket, piece.file);

                              const scaleX = boardWidth / activeVariant.image_width;
                              const scaleY = boardHeight / activeVariant.image_height;

                              const pieceLeft = (piece.slotX - piece.offsetX) * scaleX;
                              const pieceTop = (piece.slotY - piece.offsetY) * scaleY;

                              const pieceWidth = piece.pieceWidth * scaleX;
                              const pieceHeight = piece.pieceHeight * scaleY;

                              const scaledPath = scaleSvgPath(piece.path, scaleX, scaleY);

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
                    <Text style={styles.downloadButtonText}>Відкрити готове зображення</Text>
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
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </LinearGradient>
  );
}