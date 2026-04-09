import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { getMyProfile, updateMyProfile, signOut } from "../../services/auth";
import { uploadAvatar } from "../../services/storage";
import { createPremiumAvatarJob } from '../../services/premiumGeneration';

async function handleCreatePremium() {
  try {
    const result = await createPremiumAvatarJob({
      sourceImagePath: 'USER_ID/premium-source/source_171234.jpg',
      prompt: 'futuristic portrait, blue neon, cinematic light',
    });

    console.log('PREMIUM JOB CREATED:', result);
  } catch (error) {
    console.error('PREMIUM JOB ERROR:', error);
  }
}

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const [draftName, setDraftName] = useState("");
  const [uploading, setUploading] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["my_profile"],
    queryFn: getMyProfile,
  });

  const saveMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_profile"] });
    },
  });

  useEffect(() => {
    if (profileQuery.data?.name) {
      setDraftName(profileQuery.data.name);
    }
  }, [profileQuery.data?.name]);

  const profile = profileQuery.data || null;
  const avatarUrl = profile?.avatar_url || null;

  async function handleSaveProfile() {
    try {
      await saveMutation.mutateAsync({
        name: draftName,
      });

      Alert.alert("Готово", "Профіль оновлено");
    } catch (error) {
      console.error("SAVE PROFILE ERROR:", error);
      Alert.alert("Помилка", error.message || "Не вдалося оновити профіль");
    }
  }

  async function handlePickAvatar() {
    try {
      if (!profile?.id) {
        Alert.alert("Помилка", "Профіль ще не завантажився");
        return;
      }

      if (Platform.OS !== "web") {
        const permissionResult =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
          Alert.alert("Немає доступу", "Дозволь доступ до галереї");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
        base64: Platform.OS !== "web",
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      setUploading(true);

      const uploadResult = await uploadAvatar(profile.id, asset);

      await saveMutation.mutateAsync({
        name: draftName,
        avatar_url: uploadResult.publicUrl,
        avatar_path: uploadResult.storagePath,
      });

      queryClient.invalidateQueries({ queryKey: ["my_profile"] });

      Alert.alert("Готово", "Аватар оновлено");
    } catch (error) {
      console.error("AVATAR PICK ERROR:", error);
      Alert.alert("Помилка", error.message || "Не вдалося завантажити аватар");
    } finally {
      setUploading(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.error("SIGN OUT ERROR:", error);
      Alert.alert("Помилка", error.message || "Не вдалося вийти");
    }
  }

  if (profileQuery.isLoading) {
    return (
      <LinearGradient
        colors={["#081224", "#0F172A", "#111827"]}
        style={styles.gradient}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#67A8FF" />
        </View>
      </LinearGradient>
    );
  }

  if (profileQuery.isError) {
    return (
      <LinearGradient
        colors={["#081224", "#0F172A", "#111827"]}
        style={styles.gradient}
      >
        <View style={styles.centered}>
          <Text style={styles.errorText}>Не вдалося завантажити профіль</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#081224", "#0F172A", "#111827"]}
      style={styles.gradient}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>PROFILE</Text>
        <Text style={styles.title}>Профіль</Text>

        <View style={styles.card}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={44} color="#9CA3AF" />
              </View>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
              uploading && styles.disabled,
            ]}
            onPress={handlePickAvatar}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="image-outline" size={18} color="#FFF" />
                <Text style={styles.secondaryButtonText}>Змінити аватар</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Ім’я</Text>
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Введи ім’я"
            placeholderTextColor="#6B7280"
            style={styles.input}
          />

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              saveMutation.isPending && styles.disabled,
            ]}
            onPress={handleSaveProfile}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#FFF" />
                <Text style={styles.primaryButtonText}>Зберегти профіль</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Premium</Text>
          <Text style={styles.infoText}>
            На цьому етапі Premium ще без реальної покупки.
          </Text>
          <Text style={styles.infoText}>
            У вкладці Puzzle вже є окрема premium-заглушка з paywall.
          </Text>

          <View style={styles.jobBox}>
            <Text style={styles.jobLine}>
              Статус: {profile?.is_premium ? "active" : "locked"}
            </Text>
            <Text style={styles.jobLine}>
              План: {profile?.premium_plan || "premium_monthly"}
            </Text>
            <Text style={styles.jobLine}>
              Дата завершення: {profile?.premium_expires_at || "—"}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressed,
          ]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={18} color="#FFF" />
          <Text style={styles.logoutButtonText}>Вийти</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  kicker: {
    marginTop: 10,
    color: "#67A8FF",
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "700",
  },
  title: {
    color: "#FFF",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  avatarWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  avatar: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
  },
  avatarPlaceholder: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  label: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    color: "#FFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  primaryButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  logoutButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#B91C1C",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  logoutButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.6 },
  sectionTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  infoText: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  jobBox: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  jobLine: {
    color: "#E5E7EB",
    fontSize: 14,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 16,
  },
});