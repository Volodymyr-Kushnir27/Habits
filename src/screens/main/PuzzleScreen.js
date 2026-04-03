import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import {
  getFlameStats,
  getMyLatestAvatarJob,
  getMyLatestPuzzleSet,
  getPuzzlesBySetId,
  getPuzzleUnlocks,
  unlockPuzzlePiece,
  getPuzzlePiecePublicUrl,
} from '../../services/puzzle';

function resolvePieceFile(piece) {
  return piece?.file || piece?.path || null;
}

export default function PuzzleScreen() {
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  const flameStatsQuery = useQuery({
    queryKey: ['flame_stats'],
    queryFn: getFlameStats,
  });

  const jobQuery = useQuery({
    queryKey: ['my_avatar_job'],
    queryFn: getMyLatestAvatarJob,
    refetchInterval: 4000,
  });

  const setQuery = useQuery({
    queryKey: ['my_puzzle_set'],
    queryFn: getMyLatestPuzzleSet,
    refetchInterval: 4000,
  });

  const puzzlesQuery = useQuery({
    queryKey: ['puzzles_by_set', setQuery.data?.id],
    queryFn: () => getPuzzlesBySetId(setQuery.data?.id),
    enabled: !!setQuery.data?.id && setQuery.data?.status === 'done',
  });

  const unlocksQuery = useQuery({
    queryKey: ['puzzle_unlocks'],
    queryFn: getPuzzleUnlocks,
  });

  const unlockMutation = useMutation({
    mutationFn: unlockPuzzlePiece,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puzzle_unlocks'] });
      queryClient.invalidateQueries({ queryKey: ['flame_stats'] });
    },
  });

  const puzzles = puzzlesQuery.data || [];
  const currentPuzzle = puzzles[currentIndex] || null;
  const unlocks = unlocksQuery.data || [];
  const flameStats = flameStatsQuery.data || { flames: 0 };

  const unlockedSet = useMemo(() => {
    const map = new Set();

    unlocks.forEach((item) => {
      const key = `${item.puzzle_key}:${item.piece_index}`;
      map.add(key);
    });

    return map;
  }, [unlocks]);

  function isUnlocked(puzzleKey, pieceIndex) {
    return unlockedSet.has(`${puzzleKey}:${pieceIndex}`);
  }

  async function handleUnlockPiece(pieceIndex) {
    try {
      if (!currentPuzzle?.puzzle_key) return;

      await unlockMutation.mutateAsync({
        puzzleKey: currentPuzzle.puzzle_key,
        pieceIndex,
      });
    } catch (error) {
      console.error('UNLOCK ERROR:', error);
    }
  }

  const loading =
    flameStatsQuery.isLoading ||
    jobQuery.isLoading ||
    setQuery.isLoading ||
    (setQuery.data?.status === 'done' && puzzlesQuery.isLoading) ||
    unlocksQuery.isLoading;

  if (loading) {
    return (
      <LinearGradient colors={['#081224', '#0F172A', '#111827']} style={styles.gradient}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#67A8FF" />
        </View>
      </LinearGradient>
    );
  }

  if (!currentPuzzle) {
    const job = jobQuery.data;

    let helperText = 'Завантаж аватар у профілі та дочекайся обробки.';
    if (job?.status === 'pending') helperText = 'Задача на генерацію поставлена в чергу.';
    if (job?.status === 'processing') {
      helperText = `Генеруємо пазли... ${job.progress_percent ?? 0}%`;
    }
    if (job?.status === 'failed') {
      helperText = `Помилка генерації: ${job.error_text || 'невідома помилка'}`;
    }

    return (
      <LinearGradient colors={['#081224', '#0F172A', '#111827']} style={styles.gradient}>
        <View style={styles.emptyWrap}>
          <Text style={styles.kicker}>PUZZLE</Text>
          <Text style={styles.title}>Puzzle</Text>
          <Text style={styles.emptyText}>Ще немає згенерованого набору пазлів.</Text>
          <Text style={styles.emptySubText}>{helperText}</Text>
        </View>
      </LinearGradient>
    );
  }

  const manifest = Array.isArray(currentPuzzle.piece_manifest)
    ? currentPuzzle.piece_manifest
    : [];

  const totalPieces = currentPuzzle.pieces_count || manifest.length || 0;
  const unlockedCount = manifest.filter((piece) =>
    isUnlocked(currentPuzzle.puzzle_key, piece.index)
  ).length;

  return (
    <LinearGradient colors={['#081224', '#0F172A', '#111827']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>PUZZLE</Text>
        <Text style={styles.title}>Puzzle</Text>

        <View style={styles.topCard}>
          <View style={styles.flamesBox}>
            <Ionicons name="flame" size={18} color="#F59E0B" />
            <Text style={styles.flamesText}>{flameStats.flames ?? 0}</Text>
          </View>

          <Text style={styles.puzzleTitle}>
            {currentPuzzle.title || `Puzzle ${currentIndex + 1}`}
          </Text>

          <Text style={styles.progressText}>
            Відкрито шматків: {unlockedCount} / {totalPieces}
          </Text>

          {!!currentPuzzle.preview_image_url && (
            <Image
              source={{ uri: currentPuzzle.preview_image_url }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          )}

          {puzzles.length > 1 && (
            <View style={styles.navRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.navButton,
                  currentIndex === 0 && styles.disabled,
                  pressed && styles.pressed,
                ]}
                onPress={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                disabled={currentIndex === 0}
              >
                <Ionicons name="chevron-back" size={18} color="#FFF" />
                <Text style={styles.navButtonText}>Назад</Text>
              </Pressable>

              <Text style={styles.navIndex}>
                {currentIndex + 1} / {puzzles.length}
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.navButton,
                  currentIndex >= puzzles.length - 1 && styles.disabled,
                  pressed && styles.pressed,
                ]}
                onPress={() =>
                  setCurrentIndex((prev) =>
                    Math.min(prev + 1, puzzles.length - 1)
                  )
                }
                disabled={currentIndex >= puzzles.length - 1}
              >
                <Text style={styles.navButtonText}>Далі</Text>
                <Ionicons name="chevron-forward" size={18} color="#FFF" />
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.gridCard}>
          <Text style={styles.sectionTitle}>Шматки пазла</Text>
          <Text style={styles.sectionSubTitle}>
            Натисни на закритий шматок, щоб відкрити його.
          </Text>

          <View style={styles.grid}>
            {manifest.map((piece) => {
              const unlocked = isUnlocked(currentPuzzle.puzzle_key, piece.index);
              const pieceFile = resolvePieceFile(piece);
              const pieceUrl = pieceFile ? getPuzzlePiecePublicUrl(pieceFile) : null;

              return (
                <Pressable
                  key={piece.index}
                  style={({ pressed }) => [
                    styles.pieceBox,
                    unlocked ? styles.pieceUnlocked : styles.pieceLocked,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    if (!unlocked) handleUnlockPiece(piece.index);
                  }}
                  disabled={unlocked || unlockMutation.isPending}
                >
                  {unlocked && pieceUrl ? (
                    <Image
                      source={{ uri: pieceUrl }}
                      style={styles.pieceImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.lockWrap}>
                      <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
                      <Text style={styles.lockText}>#{piece.index + 1}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  kicker: {
    marginTop: 10,
    color: '#67A8FF',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '700',
  },
  title: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubText: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
  },
  topCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  gridCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  flamesBox: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  flamesText: {
    color: '#FCD34D',
    fontWeight: '800',
  },
  puzzleTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
  },
  progressText: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  navIndex: {
    color: '#E5E7EB',
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubTitle: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pieceBox: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceUnlocked: {
    backgroundColor: '#111827',
  },
  pieceLocked: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pieceImage: {
    width: '100%',
    height: '100%',
  },
  lockWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  lockText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.45,
  },
});