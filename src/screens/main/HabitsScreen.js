import { useMemo, useState } from "react";
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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { Platform } from 'react-native';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
} from "date-fns";

import {
  getHabits,
  createHabit,
  updateHabitTitle,
  updateHabitDescription,
  updateHabitColor,
  deleteHabit,
  getMonthHabitLogs,
  toggleHabitDay,
  updateHabitReminder,
  clearHabitReminder,
} from "../../services/habits";
import { getFlameStats } from "../../services/puzzle";
import {
  replaceHabitReminder,
  cancelHabitReminder,
  isWebPlatform,
} from "../../services/notifications";

import MadeInBadge from "../../components/MadeInBadge";
import styles from "./HabitsScreen.styles";

const HABIT_COLORS = [
  "#67A8FF",
  "#8B5CF6",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#14B8A6",
  "#EC4899",
  "#A3E635",
];

function getGlowStyle(color = "#67A8FF") {
  if (Platform.OS === "web") {
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

function DayCell({ active, color, disabled }) {
  return (
    <View
      style={[
        styles.dayCell,
        active && {
          backgroundColor: color || "#67A8FF",
          borderColor: color || "#67A8FF",
        },
        active && getGlowStyle(color || "#67A8FF"),
        disabled && styles.dayCellDisabled,
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
    } else if (diff !== 0) {
      current = 1;
    }
  }

  return longest;
}

function toTimeString(date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseTimeToDate(time) {
  const date = new Date();
  if (!time) {
    date.setHours(20, 0, 0, 0);
    return date;
  }

  const [hh, mm] = time.split(":").map(Number);
  date.setHours(hh || 0, mm || 0, 0, 0);
  return date;
}

function ReminderChip({ time, onPress, onClear }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={styles.reminderChip}
    >
      <Ionicons name="time-outline" size={14} color="#CDE0FF" />
      <Text style={styles.reminderChipText}>{time}</Text>

      {(hovered || Platform.OS !== 'web') && !!time? (
        <Pressable
          onPress={(e) => {
            e?.stopPropagation?.();
            onClear();
          }}
          style={styles.reminderClearButton}
        >
          <Ionicons name="close" size={12} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export default function HabitsScreen() {
  const queryClient = useQueryClient();

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitDescription, setNewHabitDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(HABIT_COLORS[0]);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingColor, setEditingColor] = useState(HABIT_COLORS[0]);

  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [reminderHabit, setReminderHabit] = useState(null);
  const [reminderDate, setReminderDate] = useState(new Date());
  const [webReminderInput, setWebReminderInput] = useState("20:00");

  const monthStart = startOfMonth(currentMonthDate);
  const monthEnd = endOfMonth(currentMonthDate);

  const monthDays = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd],
  );

  const fromDate = format(monthStart, "yyyy-MM-dd");
  const toDate = format(monthEnd, "yyyy-MM-dd");

  const habitsQuery = useQuery({
    queryKey: ["habits", fromDate, toDate],
    queryFn: () => getHabits({ fromDate, toDate }),
  });

  const logsQuery = useQuery({
    queryKey: ["habit_logs_month", fromDate, toDate],
    queryFn: () => getMonthHabitLogs({ fromDate, toDate }),
  });

  const flameStatsQuery = useQuery({
    queryKey: ["flame_stats"],
    queryFn: getFlameStats,
  });

  const createHabitMutation = useMutation({
    mutationFn: createHabit,
    onSuccess: () => {
      setNewHabitTitle("");
      setNewHabitDescription("");
      setSelectedColor(HABIT_COLORS[0]);
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
    onError: (e) => Alert.alert("Create habit error", e.message),
  });

  const renameMutation = useMutation({
    mutationFn: updateHabitTitle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["history_logs"] });
    },
    onError: (e) => Alert.alert("Rename error", e.message),
  });

  const updateDescriptionMutation = useMutation({
    mutationFn: updateHabitDescription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["history_logs"] });
    },
    onError: (e) => Alert.alert("Description error", e.message),
  });

  const recolorMutation = useMutation({
    mutationFn: updateHabitColor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["history_logs"] });
    },
    onError: (e) => Alert.alert("Color error", e.message),
  });

  const deleteHabitMutation = useMutation({
    mutationFn: deleteHabit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ queryKey: ["habit_logs_month"] });
      queryClient.invalidateQueries({ queryKey: ["history_logs"] });
      queryClient.invalidateQueries({ queryKey: ["flame_stats"] });
    },
    onError: (e) => {
      Alert.alert("Delete error", e.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleHabitDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit_logs_month"] });
      queryClient.invalidateQueries({ queryKey: ["history_logs"] });
      queryClient.invalidateQueries({ queryKey: ["flame_stats"] });
    },
    onError: (e) => Alert.alert("Toggle error", e.message),
  });

  const reminderMutation = useMutation({
    mutationFn: updateHabitReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
    onError: (e) => Alert.alert("Reminder error", e.message),
  });

  const clearReminderMutation = useMutation({
    mutationFn: clearHabitReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
    onError: (e) => Alert.alert("Reminder clear error", e.message),
  });

  function handleAddHabit() {
    const title = newHabitTitle.trim();
    if (!title) return;

    createHabitMutation.mutate({
      title,
      description: newHabitDescription.trim(),
      color: selectedColor,
    });
  }

  function openEditModal(habit) {
    setEditingHabitId(habit.id);
    setEditingTitle(habit.title);
    setEditingDescription(habit.description || "");
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

      await updateDescriptionMutation.mutateAsync({
        habitId: editingHabitId,
        description: editingDescription,
      });

      await recolorMutation.mutateAsync({
        habitId: editingHabitId,
        color: editingColor,
      });

      setEditModalVisible(false);
      setEditingHabitId(null);
      setEditingTitle("");
      setEditingDescription("");
      setEditingColor(HABIT_COLORS[0]);
    } catch (e) {
      Alert.alert("Edit error", e.message);
    }
  }

  function handleDeleteHabit(habit) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm(
        `Delete "${habit.title}" only from ${format(currentMonthDate, "MMMM yyyy")} and next months?`,
      );

      if (ok) {
        deleteHabitMutation.mutate(habit.id);
      }
      return;
    }

    Alert.alert(
      "Delete habit",
      `Delete "${habit.title}" from ${format(currentMonthDate, "MMMM yyyy")} and next months?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteHabitMutation.mutate(habit.id),
        },
      ],
    );
  }

  function openReminderModal(habit) {
    setReminderHabit(habit);

    const date = parseTimeToDate(habit.reminder_time);
    setReminderDate(date);
    setWebReminderInput(habit.reminder_time || "20:00");
    setReminderModalVisible(true);
  }

  async function handleSaveReminder() {
    if (!reminderHabit) return;

    try {
      const rawTime = isWebPlatform()
        ? webReminderInput
        : toTimeString(reminderDate);

      console.log("REMINDER SAVE START:", {
        habitId: reminderHabit.id,
        title: reminderHabit.title,
        rawTime,
      });

      const notificationId = await replaceHabitReminder({
        oldNotificationId: reminderHabit.reminder_notification_id,
        title: reminderHabit.title,
        time: rawTime,
        body: `Час виконати звичку: ${reminderHabit.title}`,
      });

      console.log("REMINDER NOTIFICATION ID:", notificationId);

      await reminderMutation.mutateAsync({
        habitId: reminderHabit.id,
        reminderTime: rawTime.length === 4 ? `0${rawTime}` : rawTime,
        reminderNotificationId: notificationId,
      });

      console.log("REMINDER SAVE DONE");

      setReminderModalVisible(false);
      setReminderHabit(null);
    } catch (e) {
      console.error("REMINDER SAVE ERROR:", e);

      if (typeof window !== "undefined" && window.alert) {
        window.alert(e.message || "Не вдалося зберегти нагадування");
      } else {
        Alert.alert("Помилка", e.message || "Не вдалося зберегти нагадування");
      }
    }
  }

  async function handleClearReminder(habit) {
    try {
      if (habit.reminder_notification_id) {
        await cancelHabitReminder(habit.reminder_notification_id);
      }

      await clearReminderMutation.mutateAsync({
        habitId: habit.id,
      });
    } catch (e) {
      Alert.alert("Помилка", e.message || "Не вдалося прибрати нагадування");
    }
  }

  const habits = habitsQuery.data || [];
  const logs = logsQuery.data || [];
  const flameStats = flameStatsQuery.data || {
    earned: 0,
    spent: 0,
    available: 0,
  };

  const logsMap = new Map();
  for (const log of logs) {
    logsMap.set(`${log.habit_id}_${log.done_date}`, !!log.is_done);
  }

  if (
    habitsQuery.isLoading ||
    logsQuery.isLoading ||
    flameStatsQuery.isLoading
  ) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#67A8FF" />
      </View>
    );
  }

  const realTodayKey = format(new Date(), "yyyy-MM-dd");

  return (
    <LinearGradient
      colors={["#0B1020", "#0F172A", "#111827"]}
      style={styles.gradient}
    >
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
                    onPress={() =>
                      setCurrentMonthDate((prev) => subMonths(prev, 1))
                    }
                  >
                    <Ionicons name="chevron-back" size={18} color="#DCEBFF" />
                  </Pressable>

                  <Text style={styles.monthTitle}>
                    {format(currentMonthDate, "MMMM yyyy")}
                  </Text>

                  <Pressable
                    style={styles.monthNavButton}
                    onPress={() =>
                      setCurrentMonthDate((prev) => addMonths(prev, 1))
                    }
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#DCEBFF"
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.headerBadges}>
                <View style={styles.headerBadge}>
                  <Ionicons name="grid-outline" size={16} color="#8EC5FF" />
                  <Text style={styles.headerBadgeText}>{habits.length}</Text>
                </View>

                <View style={styles.headerBadge}>
                  <Ionicons name="flame-outline" size={16} color="#FFB347" />
                  <Text style={styles.headerBadgeText}>
                    {flameStats.available}
                  </Text>
                </View>
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

              <TextInput
                placeholder="Description"
                placeholderTextColor="#7C8AA5"
                value={newHabitDescription}
                onChangeText={setNewHabitDescription}
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
                    {isActive ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : null}
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
                    {monthDays.map((day) => {
                      const dateKey = format(day, "yyyy-MM-dd");
                      const isToday = dateKey === realTodayKey;

                      return (
                        <Text
                          key={dateKey}
                          style={[
                            styles.monthDayText,
                            isToday && styles.monthDayTextToday,
                          ]}
                        >
                          {format(day, "d")}
                        </Text>
                      );
                    })}
                  </View>
                </View>

                {habits.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="grid-outline" size={24} color="#8AA4D6" />
                    <Text style={styles.emptyTitle}>No habits yet</Text>
                    <Text style={styles.emptyText}>
                      Add your first habit to start tracking.
                    </Text>
                  </View>
                ) : (
                  habits.map((habit) => {
                    const longestStreak = calculateLongestStreakInMonth(
                      habit.id,
                      logs,
                    );

                    return (
                      <View key={habit.id} style={styles.habitCard}>
                        <View style={styles.habitTopRow}>
                          <View style={styles.habitLeftColumn}>
                            <View style={styles.habitLeft}>
                              <View
                                style={[
                                  styles.iconCircle,
                                  {
                                    backgroundColor: `${habit.color || "#67A8FF"}22`,
                                  },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.iconCore,
                                    {
                                      backgroundColor: habit.color || "#67A8FF",
                                    },
                                    getGlowStyle(habit.color || "#67A8FF"),
                                  ]}
                                />
                              </View>

                              <View style={styles.habitInfo}>
                                <Pressable onPress={() => openEditModal(habit)}>
                                  <Text style={styles.habitTitle}>
                                    {habit.title}
                                  </Text>
                                </Pressable>

                                {habit.description ? (
                                  <Text style={styles.habitDescription}>
                                    {habit.description}
                                  </Text>
                                ) : null}

                                <Text style={styles.habitHint}>
                                  Tap title to rename
                                </Text>
                                <Text style={styles.streakText}>
                                  🔥 {longestStreak} day
                                  {longestStreak === 1 ? "" : "s"}
                                </Text>

                                <View style={styles.reminderRow}>
                                  {habit.reminder_time ? (
                                    <ReminderChip
                                      time={habit.reminder_time}
                                      onPress={() => openReminderModal(habit)}
                                      onClear={() => handleClearReminder(habit)}
                                    />
                                  ) : (
                                    <Pressable
                                      onPress={() => openReminderModal(habit)}
                                      style={styles.addReminderButton}
                                    >
                                      <Ionicons
                                        name="time-outline"
                                        size={14}
                                        color="#CDE0FF"
                                      />
                                      <Text style={styles.addReminderText}>
                                        Set reminder
                                      </Text>
                                    </Pressable>
                                  )}
                                </View>
                              </View>
                            </View>

                            <Pressable
                              style={styles.deleteButton}
                              onPress={() => handleDeleteHabit(habit)}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={16}
                                color="#FF7D7D"
                              />
                            </Pressable>
                          </View>

                          <View style={styles.daysRow}>
                            {monthDays.map((day) => {
                              const dateKey = format(day, "yyyy-MM-dd");
                              const isOnlyTodayAllowed =
                                dateKey === realTodayKey;
                              const active =
                                logsMap.get(`${habit.id}_${dateKey}`) || false;

                              return (
                                <Pressable
                                  key={dateKey}
                                  disabled={!isOnlyTodayAllowed}
                                  onPress={() =>
                                    toggleMutation.mutate({
                                      habitId: habit.id,
                                      doneDate: dateKey,
                                      isDone: !active,
                                    })
                                  }
                                  style={
                                    !isOnlyTodayAllowed
                                      ? styles.futureDayDisabled
                                      : null
                                  }
                                >
                                  <DayCell
                                    active={active}
                                    color={habit.color || "#67A8FF"}
                                    disabled={!isOnlyTodayAllowed}
                                  />
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

                  <TextInput
                    value={editingDescription}
                    onChangeText={setEditingDescription}
                    style={[styles.modalInput, styles.modalTextarea]}
                    placeholder="Description"
                    placeholderTextColor="#6D7B93"
                    multiline
                    textAlignVertical="top"
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

            <Modal
              transparent
              animationType="fade"
              visible={reminderModalVisible}
              onRequestClose={() => setReminderModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Reminder time</Text>
                  <Text style={styles.reminderModalHabitTitle}>
                    {reminderHabit?.title || ""}
                  </Text>

                  {Platform.OS === "web" ? (
                    <input
                      type="time"
                      value={webReminderInput}
                      onChange={(e) => setWebReminderInput(e.target.value)}
                      style={{
                        width: "100%",
                        height: 52,
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "#091427",
                        color: "#F7FAFF",
                        fontSize: "16px",
                        padding: "0 16px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  ) : (
                    <DateTimePicker
                      value={reminderDate}
                      mode="time"
                      is24Hour
                      display="spinner"
                      onChange={(_, value) => {
                        if (value) setReminderDate(value);
                      }}
                    />
                  )}

                  <View style={styles.modalActions}>
                    <Pressable
                      style={[styles.modalButton, styles.modalCancel]}
                      onPress={() => setReminderModalVisible(false)}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.modalButton, styles.modalSave]}
                      onPress={handleSaveReminder}
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
