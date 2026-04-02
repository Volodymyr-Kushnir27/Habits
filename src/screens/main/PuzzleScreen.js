import { useMemo, useState, useEffect } from 'react';
import {
  Alert,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, ClipPath, Path, Image as SvgImage } from 'react-native-svg';

import MadeInBadge from '../../components/MadeInBadge';
import {
  DEFAULT_PUZZLE_YEAR,
  getFlameStats,
  getPuzzlesByYear,
  getPuzzleUnlocks,
  unlockPuzzlePiece,
  getPuzzlePiecePublicUrl,
} from '../../services/puzzle';
import styles from './PuzzleScreen.styles';

export default function PuzzleScreen() {
  const queryClient = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);

  const flameStatsQuery = useQuery({
    queryKey: ['flame_stats'],
    queryFn: getFlameStats,
  });

  const puzzlesQuery = useQuery({
    queryKey: ['puzzles', DEFAULT_PUZZLE_YEAR],
    queryFn: () => getPuzzlesByYear(DEFAULT_PUZZLE_YEAR),
  });

  const puzzles = puzzlesQuery.data || [];
  const currentPuzzle = puzzles[currentIndex] || null;

  useEffect(() => {
    if (currentIndex > 0 && currentIndex >= puzzles.length) {
      setCurrentIndex(Math.max(puzzles.length - 1, 0));
    }
  }, [currentIndex, puzzles.length]);

  const unlocksQuery = useQuery({
    queryKey: ['puzzle_unlocks', currentPuzzle?.puzzle_key],
    queryFn: () => getPuzzleUnlocks({ puzzleKey: currentPuzzle.puzzle_key }),
    enabled: !!currentPuzzle?.puzzle_key,
  });

  const unlockMutation = useMutation({
    mutationFn: unlockPuzzlePiece,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flame_stats'] });
      queryClient.invalidateQueries({ queryKey: ['puzzle_unlocks', currentPuzzle?.puzzle_key] });
    },
    onError: (e) => Alert.alert('Puzzle error', e.message),
  });

  const unlocks = unlocksQuery.data || [];
  const unlockedSet = useMemo(
    () => new Set(unlocks.map((item) => item.piece_index)),
    [unlocks]
  );

  if (flameStatsQuery.isLoading || puzzlesQuery.isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#67A8FF" />
      </View>
    );
  }

  const flameStats = flameStatsQuery.data || { earned: 0, spent: 0, available: 0 };

  if (!currentPuzzle) {
    return (
      <LinearGradient colors={['#0B1020', '#0F172A', '#111827']} style={styles.gradient}>
        <View style={styles.screen}>
          <View style={styles.emptyWrap}>
            <Text style={styles.kicker}>PUZZLE</Text>
            <Text style={styles.title}>Puzzle</Text>
            <Text style={styles.emptyText}>Поки що пазли не додані.</Text>
          </View>
          <MadeInBadge />
        </View>
      </LinearGradient>
    );
  }

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < puzzles.length - 1;

  const boardWidth = Number(currentPuzzle.image_width || 1200);
  const boardHeight = Number(currentPuzzle.image_height || 800);
  const manifest = Array.isArray(currentPuzzle.piece_manifest) ? currentPuzzle.piece_manifest : [];
  const version = currentPuzzle.updated_at || currentPuzzle.created_at || `${currentPuzzle.puzzle_key}`;

  const maxBoardWidth = Math.min(screenWidth - 28, 860);
  const boardAspectRatio = boardWidth / boardHeight;

  function handlePrev() {
    if (!canGoPrev) return;
    setCurrentIndex((prev) => prev - 1);
  }

  function handleNext() {
    if (!canGoNext) return;
    setCurrentIndex((prev) => prev + 1);
  }

  function handleUnlock(pieceIndex) {
    if (unlockedSet.has(pieceIndex)) return;

    unlockMutation.mutate({
      puzzleKey: currentPuzzle.puzzle_key,
      pieceIndex,
      piecesCount: currentPuzzle.pieces_count || 30,
    });
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
                Збирай вогники кожного дня для розблокування пазлів
              </Text>
            </View>

            <View style={styles.flameBadge}>
              <Ionicons name="flame-outline" size={16} color="#FFB347" />
              <Text style={styles.flameBadgeText}>{flameStats.available}</Text>
            </View>
          </View>

          <View style={styles.navRow}>
            <Pressable
              style={[styles.navButton, !canGoPrev && styles.navButtonDisabled]}
              onPress={handlePrev}
              disabled={!canGoPrev}
            >
              <Ionicons name="chevron-back" size={18} color="#DCEBFF" />
            </Pressable>

            <View style={styles.navCenter}>
              <Text style={styles.navTitle}>{currentPuzzle.title}</Text>
              <Text style={styles.navMeta}>
                {currentIndex + 1} / {puzzles.length}
              </Text>
            </View>

            <Pressable
              style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
              onPress={handleNext}
              disabled={!canGoNext}
            >
              <Ionicons name="chevron-forward" size={18} color="#DCEBFF" />
            </Pressable>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Зароблено</Text>
              <Text style={styles.statValue}>{flameStats.earned}</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Витрачено</Text>
              <Text style={styles.statValue}>{flameStats.spent}</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Відкрито</Text>
              <Text style={styles.statValue}>
                {unlocks.length}/{currentPuzzle.pieces_count}
              </Text>
            </View>
          </View>

          {unlocksQuery.isLoading ? (
            <View style={styles.unlocksLoader}>
              <ActivityIndicator size="large" color="#67A8FF" />
            </View>
          ) : (
            <View style={styles.boardOuter}>
              <View style={[styles.boardFrame, { width: maxBoardWidth }]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                  style={styles.boardGradient}
                >
                  <View
                    style={[
                      styles.board,
                      {
                        aspectRatio: boardAspectRatio,
                      },
                    ]}
                  >
                    {manifest.map((piece) => {
                      const unlocked = unlockedSet.has(piece.index);
                      const pieceUrl = getPuzzlePiecePublicUrl(piece.file, version);

                      const pieceLeft = ((piece.slotX - piece.offsetX) / boardWidth) * 100;
                      const pieceTop = ((piece.slotY - piece.offsetY) / boardHeight) * 100;
                      const pieceWidth = (piece.pieceWidth / boardWidth) * 100;
                      const pieceHeight = (piece.pieceHeight / boardHeight) * 100;

                      const badgeCenterX =
                        ((piece.offsetX + piece.slotWidth / 2) / piece.pieceWidth) * 100;
                      const badgeCenterY =
                        ((piece.offsetY + piece.slotHeight / 2) / piece.pieceHeight) * 100;

                      const clipId = `clip_${currentPuzzle.puzzle_key}_${piece.index}`;

                      return (
                        <Pressable
                          key={`piece_${piece.index}`}
                          onPress={() => handleUnlock(piece.index)}
                          disabled={unlocked || unlockMutation.isPending}
                          style={[
                            styles.piecePressable,
                            {
                              left: `${pieceLeft}%`,
                              top: `${pieceTop}%`,
                              width: `${pieceWidth}%`,
                              height: `${pieceHeight}%`,
                            },
                          ]}
                        >
                          <Svg
                            width="100%"
                            height="100%"
                            viewBox={`0 0 ${piece.pieceWidth} ${piece.pieceHeight}`}
                            style={[
                              styles.pieceSvg,
                              Platform.OS !== 'web' && styles.pieceShadowNative,
                            ]}
                          >
                            <Defs>
                              <ClipPath id={clipId}>
                                <Path d={piece.path} />
                              </ClipPath>
                            </Defs>

                            {unlocked ? (
                              <SvgImage
                                href={{ uri: pieceUrl }}
                                x="0"
                                y="0"
                                width={piece.pieceWidth}
                                height={piece.pieceHeight}
                                preserveAspectRatio="none"
                                clipPath={`url(#${clipId})`}
                              />
                            ) : (
                              <>
                                <Path
                                  d={piece.path}
                                  fill="rgba(255,255,255,0.03)"
                                  stroke="rgba(255,255,255,0.09)"
                                  strokeWidth="2"
                                />
                              </>
                            )}
                          </Svg>

                          {!unlocked ? (
                            <View
                              pointerEvents="none"
                              style={[
                                styles.lockBadge,
                                {
                                  left: `${badgeCenterX}%`,
                                  top: `${badgeCenterY}%`,
                                  marginLeft: -23,
                                  marginTop: -20,
                                },
                              ]}
                            >
                              <View style={styles.badgeInner}>
                                <Ionicons name="lock-closed-outline" size={14} color="#8EA4C8" />
                                <Text style={styles.pieceLockedText}>1 🔥</Text>
                              </View>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </LinearGradient>
              </View>
            </View>
          )}
        </ScrollView>

        <MadeInBadge />
      </View>
    </LinearGradient>
  );
}