import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Image, Platform, Linking, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  getMyLatestAvatarJob,
  getMyAvatarVariants,
  getUnlockedPieceIndexes,
  unlockPuzzlePiece,
  getFlameStats,
  markVariantCompleted,
} from '../../services/puzzle';

export default function PuzzleScreen() {
  const queryClient = useQueryClient();
  const [active, setActive] = useState(null);

  const latestJobQuery = useQuery({
    queryKey: ['my_avatar_job'],
    queryFn: getMyLatestAvatarJob,
    refetchInterval: 4000,
  });

  const variantsQuery = useQuery({
    queryKey: ['avatar_variants', latestJobQuery.data?.id],
    queryFn: () => getMyAvatarVariants(latestJobQuery.data?.id),
    enabled: !!latestJobQuery.data?.id,
    refetchInterval: 4000,
  });

  const flameStatsQuery = useQuery({
    queryKey: ['flame_stats'],
    queryFn: getFlameStats,
  });

  const unlocksQuery = useQuery({
    queryKey: ['puzzle_unlocks', active?.id],
    queryFn: () => getUnlockedPieceIndexes(active?.id),
    enabled: !!active?.id,
  });

  useEffect(() => {
    if (!active && variantsQuery.data?.length) {
      setActive(variantsQuery.data[0]);
    }
  }, [variantsQuery.data, active]);

  const unlockMutation = useMutation({
    mutationFn: unlockPuzzlePiece,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['puzzle_unlocks'] });
      queryClient.invalidateQueries({ queryKey: ['flame_stats'] });
    },
    onError: (e) => {
      Alert.alert('Помилка', e.message || 'Не вдалося відкрити частину пазла');
    },
  });

  const completeMutation = useMutation({
    mutationFn: markVariantCompleted,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_profile'] });
      queryClient.invalidateQueries({ queryKey: ['avatar_variants'] });
    },
    onError: (e) => {
      Alert.alert('Помилка', e.message || 'Не вдалося завершити пазл');
    },
  });

  const variants = variantsQuery.data || [];
  const unlockedIndexes = unlocksQuery.data || [];
  const unlockedSet = new Set(unlockedIndexes);
  const flames = flameStatsQuery.data?.available || 0;

  const totalPieces = active?.pieces_count || 16;
  const grid = Math.sqrt(totalPieces);
  const isComplete = unlockedSet.size >= totalPieces;

  const imageUrl = useMemo(() => {
    if (!active?.generated_path) return null;
    const { data } = supabase.storage
      .from('avatar_generated')
      .getPublicUrl(active.generated_path);
    return data?.publicUrl || null;
  }, [active]);

  useEffect(() => {
    if (!active || !imageUrl || !isComplete || active.is_completed) return;

    completeMutation.mutate({
      variantId: active.id,
      generatedPath: active.generated_path,
      generatedUrl: imageUrl,
    });
  }, [active, imageUrl, isComplete, completeMutation]);

  const handleUnlock = async (pieceIndex) => {
    if (!active) return;
    if (unlockedSet.has(pieceIndex)) return;

    if (flames <= 0) {
      Alert.alert('Недостатньо вогників', 'Спочатку виконай звички та зароби вогники.');
      return;
    }

    await unlockMutation.mutateAsync({
      variantId: active.id,
      pieceIndex,
    });
  };

  const onDownload = async () => {
    if (!isComplete || !imageUrl) return;

    try {
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `avatar_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      await Linking.openURL(imageUrl);
    } catch (e) {
      console.log('PUZZLE DOWNLOAD ERROR:', e);
    }
  };

  if (latestJobQuery.isLoading || variantsQuery.isLoading || flameStatsQuery.isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Puzzle</Text>
        <Text style={styles.text}>Завантаження…</Text>
      </View>
    );
  }

  if (!latestJobQuery.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Puzzle</Text>
        <Text style={styles.text}>Ще немає задачі на AI-пазли.</Text>
      </View>
    );
  }

  if (!variants.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Puzzle</Text>
        <Text style={styles.text}>AI-зображення ще генеруються. Спробуй трохи пізніше.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Puzzle</Text>
          <Text style={styles.text}>
            Вогники: {flames} · Відкрито: {unlockedSet.size}/{totalPieces}
          </Text>
        </View>

        <Pressable
          onPress={onDownload}
          disabled={!isComplete}
          style={[
            styles.downloadBtn,
            !isComplete && styles.downloadBtnDisabled,
          ]}
        >
          <Text style={styles.downloadBtnText}>Download</Text>
        </Pressable>
      </View>

      {!!imageUrl && (
        <View style={styles.boardWrap}>
          <PuzzleBoard
            imageUrl={imageUrl}
            grid={grid}
            unlockedSet={unlockedSet}
            onUnlock={handleUnlock}
          />
        </View>
      )}

      <View style={styles.variantsRow}>
        {variants.map((item) => {
          const selected = item.id === active?.id;

          return (
            <Pressable
              key={item.id}
              onPress={() => setActive(item)}
              style={[styles.variantBtn, selected && styles.variantBtnActive]}
            >
              <Text style={styles.variantBtnText}>{item.idx + 1}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PuzzleBoard({ imageUrl, grid, unlockedSet, onUnlock }) {
  const boardSize = 320;
  const tile = boardSize / grid;
  const pieces = [];

  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const idx = r * grid + c;
      const unlocked = unlockedSet.has(idx);

      pieces.push(
        <Pressable
          key={idx}
          onPress={() => onUnlock(idx)}
          style={{
            position: 'absolute',
            left: c * tile,
            top: r * tile,
            width: tile,
            height: tile,
            borderWidth: 1,
            borderColor: '#1E335A',
            overflow: 'hidden',
            backgroundColor: '#08152E',
            opacity: unlocked ? 1 : 0.15,
          }}
        >
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: boardSize,
              height: boardSize,
              transform: [
                { translateX: -c * tile },
                { translateY: -r * tile },
              ],
            }}
          />

          {!unlocked ? (
            <View
              style={{
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(2,11,34,0.78)',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>1 🔥</Text>
            </View>
          ) : null}
        </Pressable>
      );
    }
  }

  return <View style={{ width: boardSize, height: boardSize }}>{pieces}</View>;
}

const styles = {
  screen: {
    flex: 1,
    padding: 16,
    backgroundColor: '#020B22',
  },
  center: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#020B22',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  text: {
    color: '#AFC3E6',
    marginTop: 8,
    fontSize: 15,
  },
  boardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  downloadBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#335EA8',
    backgroundColor: '#12305C',
  },
  downloadBtnDisabled: {
    opacity: 0.45,
  },
  downloadBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  variantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  variantBtn: {
    minWidth: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0D1E3D',
    borderWidth: 1,
    borderColor: '#223E73',
  },
  variantBtnActive: {
    backgroundColor: '#2F66E0',
    borderColor: '#2F66E0',
  },
  variantBtnText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
};