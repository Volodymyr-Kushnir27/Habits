import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { getHistoryByRange } from '../../services/habits';
import { deleteHistoryEntry } from '../../services/history';
import MadeInBadge from '../../components/MadeInBadge';
import { styles } from './HistoryScreen.styles';

export default function HistoryScreen() {
  const queryClient = useQueryClient();
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonthDate);
  const monthEnd = endOfMonth(currentMonthDate);

  const fromDate = format(monthStart, 'yyyy-MM-dd');
  const toDate = format(monthEnd, 'yyyy-MM-dd');

  const historyQuery = useQuery({
    queryKey: ['history_logs', fromDate, toDate],
    queryFn: () => getHistoryByRange({ fromDate, toDate }),
  });

  const deleteEntryMutation = useMutation({
  mutationFn: deleteHistoryEntry,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['history_logs'] });
    queryClient.invalidateQueries({ queryKey: ['habit_logs'] });
  },
});

  const days = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );

  async function handleDeleteHistoryEntry(item) {
    try {
      await deleteEntryMutation.mutateAsync({
        habitId: item.habit_id,
        doneDate: item.done_date,
      });
    } catch (error) {
      console.error('DELETE HISTORY ENTRY ERROR:', error);
      Alert.alert('Помилка', error.message || 'Не вдалося видалити запис');
    }
  }

  if (historyQuery.isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#67A8FF" />
      </View>
    );
  }

  const items = historyQuery.data || [];

  const grouped = items.reduce((acc, item) => {
    const key = item.done_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <LinearGradient colors={['#0B1020', '#0F172A', '#111827']} style={styles.gradient}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.kicker}>ARCHIVE</Text>

          <View style={styles.headerRow}>
            <Pressable
              style={styles.monthNavButton}
              onPress={() => setCurrentMonthDate((prev) => subMonths(prev, 1))}
            >
              <Ionicons name="chevron-back" size={18} color="#DCEBFF" />
            </Pressable>

            <Text style={styles.title}>{format(currentMonthDate, 'MMMM yyyy')}</Text>

            <Pressable
              style={styles.monthNavButton}
              onPress={() => setCurrentMonthDate((prev) => addMonths(prev, 1))}
            >
              <Ionicons name="chevron-forward" size={18} color="#DCEBFF" />
            </Pressable>
          </View>

          {days.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const records = grouped[dayKey] || [];

            return (
              <View key={dayKey} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayNumber}>{format(day, 'dd')}</Text>
                  <Text style={styles.dayLabel}>{format(day, 'MMMM')}</Text>
                </View>

                {records.length === 0 ? (
                  <Text style={styles.emptyDayText}>Немає виконаних звичок</Text>
                ) : (
                  records.map((item) => (
                    <View key={item.id} style={styles.historyItemRow}>
                      <View style={styles.historyItemLeft}>
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: item.habits?.color || '#67A8FF' },
                          ]}
                        />
                        <Text style={styles.rowText}>
                          {item.habits?.title || 'Звичка'}
                        </Text>
                      </View>

                      <Pressable
                        style={({ pressed }) => [
                          styles.deleteButton,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => handleDeleteHistoryEntry(item)}
                        disabled={deleteEntryMutation.isPending}
                      >
                        <Ionicons name="close" size={16} color="#F87171" />
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            );
          })}
        </ScrollView>

        <MadeInBadge />
      </View>
    </LinearGradient>
  );
}