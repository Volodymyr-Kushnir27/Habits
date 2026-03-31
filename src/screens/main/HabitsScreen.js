import { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from 'date-fns';

import {
  getHabits,
  createHabit,
  updateHabitTitle,
  updateHabitColor,
  deleteHabit,
  getMonthHabitLogs,
  toggleHabitDay,
} from '../../services/habits';

import MadeInBadge from '../../components/MadeInBadge';
import styles from './HabitsScreen.styles';

const HABIT_COLORS = [
  '#67A8FF',
  '#8B5CF6',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#14B8A6',
  '#EC4899',
  '#A3E635',
];

function getGlowStyle(color = '#67A8FF') {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0 0 18px ${color}66`,
    };
  }

  return {
    shadowColor: color,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  };
}

function DayCell({ active, color }) {
  return (
    <View
      style={[
        styles.dayCell,
        active && {
          backgroundColor: color || '#67A8FF',
          borderColor: color || '#67A8FF',
        },
        active && getGlowStyle(color || '#67A8FF'),
      ]}
    />
  );
}

function calculateLongestStreakInMonth(habitId, monthLogs) {
  const dates = monthLogs
    .filter((log) => log.habit_id === habitId && log.is_done)
    .map((log) => log.done_date)
    .sort();

  if (!dates.length) return 0;
  if (dates.length === 1) return 1;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(`${dates[i - 1]}T00:00:00`);
    const curr = new Date(`${dates[i]}T00:00:00`);

    const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

    if (diff === 1) {
      current += 1;
      if (current > longest) longest = current;
    } else if (diff === 0) {
      continue;
    } else {
      current = 1;
    }
  }

  return longest;
}

export default function HabitsScreen() {
  const queryClient = useQueryClient();

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(HABIT_COLORS[0]);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingColor, setEditingColor] = useState(HABIT_COLORS[0]);

  const monthStart = startOfMonth(currentMonthDate);
  const monthEnd = endOfMonth(currentMonthDate);

  const monthDays = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );

  const fromDate = format(monthStart, 'yyyy-MM-dd');
  const toDate = format(monthEnd, 'yyyy-MM-dd');

  const habitsQuery = useQuery({
    queryKey: ['habits', fromDate, toDate],
    queryFn: () => getHabits({ fromDate, toDate }),
  });

  const logsQuery = useQuery({
    queryKey: ['habit_logs_month', fromDate, toDate],
    queryFn: () => getMonthHabitLogs({ fromDate, toDate }),
  });

  const createHabitMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      setNewHabitTitle('');
      setSelectedColor(HABIT_COLORS[0]);
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    },
    onError: (e) => Alert.alert('Create habit error', e.message),
  });

  const renameMutation = useMutation({
    mutationFn: updateHabitTitle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['history_logs'] });
    },
    onError: (e) => Alert.alert('Rename error', e.message),
  });

  const recolorMutation = useMutation({
    mutationFn: updateHabitColor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['history_logs'] });
    },
    onError: (e) => Alert.alert('Color error', e.message),
  });

  const deleteHabitMutation = useMutation({
    mutationFn: deleteHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habit_logs_month'] });
      queryClient.invalidateQueries({ queryKey: ['history_logs'] });
    },
    onError: (e) => {
      Alert.alert('Delete error', e.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleHabitDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit_logs_month'] });
      queryClient.invalidateQueries({ queryKey: ['history_logs'] });
    },
    onError: (e) => Alert.alert('Toggle error', e.message),
  });

  function handleAddHabit() {
    const title = newHabitTitle.trim();
    if (!title) return;

    createHabitMutation.mutate({
      title,
      color: selectedColor,
    });
  }

  function openEditModal(habit) {
    setEditingHabitId(habit.id);
    setEditingTitle(habit.title);
    setEditingColor(habit.color || HABIT_COLORS[0]);
    setEditModalVisible(true);
  }

  async function handleSaveEdit() {
    const title = editingTitle.trim();
    if (!title || !editingHabitId) return;

    try {
      await renameMutation.mutateAsync({
        habitId: editingHabitId,
        title,
      });

      await recolorMutation.mutateAsync({
        habitId: editingHabitId,
        color: editingColor,
      });

      setEditModalVisible(false);
      setEditingHabitId(null);
      setEditingTitle('');
      setEditingColor(HABIT_COLORS[0]);
    } catch (e) {
      Alert.alert('Edit error', e.message);
    }
  }

  function handleDeleteHabit(habit) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const ok = window.confirm(
        `Delete "${habit.title}" only from ${format(currentMonthDate, 'MMMM yyyy')} and next months?`
      );

      if (ok) {
        deleteHabitMutation.mutate(habit.id);
      }
      return;
    }

    Alert.alert(
      'Delete habit',
      `Delete "${habit.title}" from ${format(currentMonthDate, 'MMMM yyyy')} and next months?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteHabitMutation.mutate(habit.id),
        },
      ]
    );
  }

  const habits = habitsQuery.data || [];
  const logs = logsQuery.data || [];

  const logsMap = new Map();
  for (const log of logs) {
    logsMap.set(`${log.habit_id}_${log.done_date}`, !!log.is_done);
  }

  if (habitsQuery.isLoading || logsQuery.isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#67A8FF" />
      </View>
    );
  }

  const realTodayKey = format(new Date(), 'yyyy-MM-dd');
  const viewedMonthKey = format(currentMonthDate, 'yyyy-MM');
  const realMonthKey = format(new Date(), 'yyyy-MM');

  return (
    <LinearGradient colors={['#0B1020', '#0F172A', '#111827']} style={styles.gradient}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <View style={styles.header}>
              <View>
                <Text style={styles.kicker}>TRACKER</Text>
                <Text style={styles.title}>Habits</Text>

                <View style={styles.monthNavRow}>
                  <Pressable
                    style={styles.monthNavButton}
                    onPress={() => setCurrentMonthDate((prev) => subMonths(prev, 1))}
                  >
                    <Ionicons name="chevron-back" size={18} color="#DCEBFF" />
                  </Pressable>

                  <Text style={styles.monthTitle}>
                    {format(currentMonthDate, 'MMMM yyyy')}
                  </Text>

                  <Pressable
                    style={styles.monthNavButton}
                    onPress={() => setCurrentMonthDate((prev) => addMonths(prev, 1))}
                  >
                    <Ionicons name="chevron-forward" size={18} color="#DCEBFF" />
                  </Pressable>
                </View>
              </View>

              <View style={styles.headerBadge}>
                <Ionicons name="sparkles-outline" size={16} color="#8EC5FF" />
                <Text style={styles.headerBadgeText}>{habits.length}</Text>
              </View>
            </View>

            <View style={styles.addCard}>
              <TextInput
                placeholder="New habit"
                placeholderTextColor="#7C8AA5"
                value={newHabitTitle}
                onChangeText={setNewHabitTitle}
                style={styles.input}
              />

              <Pressable style={styles.addButton} onPress={handleAddHabit}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addButtonText}>Add</Text>
              </Pressable>
            </View>

            <View style={styles.colorsRow}>
              {HABIT_COLORS.map((color) => {
                const isActive = selectedColor === color;

                return (
                  <Pressable
                    key={color}
                    onPress={() => setSelectedColor(color)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      isActive && styles.colorDotActive,
                    ]}
                  >
                    {isActive ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </Pressable>
                );
              })}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalContent}
            >
              <View>
                <View style={styles.monthHeader}>
                  <View style={styles.leftSpacer} />
                  <View style={styles.monthDaysHeaderRow}>
                    {monthDays.map((day) => (
                      <Text key={format(day, 'yyyy-MM-dd')} style={styles.monthDayText}>
                        {format(day, 'd')}
                      </Text>
                    ))}
                  </View>
                </View>

                {habits.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="grid-outline" size={24} color="#8AA4D6" />
                    <Text style={styles.emptyTitle}>No habits yet</Text>
                    <Text style={styles.emptyText}>Add your first habit to start tracking.</Text>
                  </View>
                ) : (
                  habits.map((habit) => {
                    const longestStreak = calculateLongestStreakInMonth(habit.id, logs);

                    return (
                      <View key={habit.id} style={styles.habitCard}>
                        <View style={styles.habitTopRow}>
                          <View style={styles.habitLeftColumn}>
                            <View style={styles.habitLeft}>
                              <View
                                style={[
                                  styles.iconCircle,
                                  { backgroundColor: `${habit.color || '#67A8FF'}22` },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.iconCore,
                                    { backgroundColor: habit.color || '#67A8FF' },
                                    getGlowStyle(habit.color || '#67A8FF'),
                                  ]}
                                />
                              </View>

                              <View style={styles.habitInfo}>
                                <Pressable onPress={() => openEditModal(habit)}>
                                  <Text style={styles.habitTitle}>{habit.title}</Text>
                                </Pressable>

                                <Text style={styles.habitHint}>Tap title to rename</Text>
                                <Text style={styles.streakText}>
                                  🔥 {longestStreak} day{longestStreak === 1 ? '' : 's'}
                                </Text>
                              </View>
                            </View>

                            <Pressable
                              style={styles.deleteButton}
                              onPress={() => handleDeleteHabit(habit)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#FF7D7D" />
                            </Pressable>
                          </View>

                          <View style={styles.daysRow}>
                            {monthDays.map((day) => {
                              const dateKey = format(day, 'yyyy-MM-dd');

                              let isFuture = false;

                              if (viewedMonthKey > realMonthKey) {
                                isFuture = true;
                              } else if (viewedMonthKey === realMonthKey) {
                                isFuture = dateKey > realTodayKey;
                              }

                              const active = logsMap.get(`${habit.id}_${dateKey}`) || false;

                              return (
                                <Pressable
                                  key={dateKey}
                                  disabled={isFuture}
                                  onPress={() =>
                                    toggleMutation.mutate({
                                      habitId: habit.id,
                                      doneDate: dateKey,
                                      isDone: !active,
                                    })
                                  }
                                  style={isFuture ? styles.futureDayDisabled : null}
                                >
                                  <DayCell active={active} color={habit.color || '#67A8FF'} />
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>

            <Modal
              transparent
              animationType="fade"
              visible={editModalVisible}
              onRequestClose={() => setEditModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Edit habit</Text>

                  <TextInput
                    value={editingTitle}
                    onChangeText={setEditingTitle}
                    style={styles.modalInput}
                    placeholder="Habit name"
                    placeholderTextColor="#6D7B93"
                  />

                  <View style={styles.modalColorsRow}>
                    {HABIT_COLORS.map((color) => {
                      const active = editingColor === color;

                      return (
                        <Pressable
                          key={color}
                          onPress={() => setEditingColor(color)}
                          style={[
                            styles.modalColorDot,
                            { backgroundColor: color },
                            active && styles.colorDotActive,
                          ]}
                        >
                          {active ? (
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.modalActions}>
                    <Pressable
                      style={[styles.modalButton, styles.modalCancel]}
                      onPress={() => setEditModalVisible(false)}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.modalButton, styles.modalSave]}
                      onPress={handleSaveEdit}
                    >
                      <Text style={styles.modalSaveText}>Save</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        </ScrollView>

        <MadeInBadge />
      </View>
    </LinearGradient>
  );
}