import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
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
import MadeInBadge from '../../components/MadeInBadge';

export default function HistoryScreen() {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonthDate);
  const monthEnd = endOfMonth(currentMonthDate);

  const fromDate = format(monthStart, 'yyyy-MM-dd');
  const toDate = format(monthEnd, 'yyyy-MM-dd');

  const historyQuery = useQuery({
    queryKey: ['history_logs', fromDate, toDate],
    queryFn: () => getHistoryByRange({ fromDate, toDate }),
  });

  const days = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );

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
                  <Text style={styles.emptyDayText}>No completed habits</Text>
                ) : (
                  records.map((item) => (
                    <View key={item.id} style={styles.row}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: item.habits?.color || '#67A8FF' },
                        ]}
                      />
                      <Text style={styles.rowText}>{item.habits?.title || 'Habit'}</Text>
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

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },

  screen: {
    flex: 1,
    position: 'relative',
  },

  loaderWrap: {
    flex: 1,
    backgroundColor: '#0B1020',
    alignItems: 'center',
    justifyContent: 'center',
  },

  container: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 120,
  },

  kicker: {
    color: '#7FA8FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },

  monthNavButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    color: '#F7FAFF',
    fontSize: 32,
    fontWeight: '800',
    textTransform: 'capitalize',
  },

  dayCard: {
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },

  dayNumber: {
    color: '#F7FAFF',
    fontSize: 24,
    fontWeight: '800',
    marginRight: 8,
  },

  dayLabel: {
    color: '#8EA4C8',
    fontSize: 14,
    textTransform: 'capitalize',
  },

  emptyDayText: {
    color: '#6F829F',
    fontSize: 14,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },

  rowText: {
    color: '#F7FAFF',
    fontSize: 15,
  },
});