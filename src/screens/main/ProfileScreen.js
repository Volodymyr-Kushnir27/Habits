import { useEffect, useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { getMyProfile, updateMyProfile, signOut } from '../../services/auth';
import { uploadAvatar } from '../../services/storage';
import MadeInBadge from '../../components/MadeInBadge';



export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const [draftName, setDraftName] = useState('');
  const [uploading, setUploading] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['my_profile'],
    queryFn: getMyProfile,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setDraftName(profileQuery.data?.name || '');
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_profile'] });
    },
    onError: (e) => Alert.alert('Save error', e.message),
  });

  const logoutMutation = useMutation({
    mutationFn: signOut,
    onError: (e) => Alert.alert('Logout error', e.message),
  });

 async function handlePickAvatar() {
  try {
    const profile = profileQuery.data;
    if (!profile?.id) {
      Alert.alert('Error', 'Profile not loaded yet');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setUploading(true);

    const uploadResult = await uploadAvatar(profile.id, asset.uri);
    // очікуємо:
    // { publicUrl, storagePath }

    await saveMutation.mutateAsync({
      name: draftName,
      avatar_url: uploadResult.publicUrl,
    });
    Alert.alert('Успіх', 'Аватар завантажено. Генерація пазлів почалась.');
  } catch (e) {
    console.error('AVATAR UPLOAD ERROR:', e);
    Alert.alert('Avatar upload error', e.message);
  } finally {
    setUploading(false);
  }
}

  function handleSaveName() {
    saveMutation.mutate({
      name: draftName,
    });
  }

  function handleLogout() {
    logoutMutation.mutate();
  }

  if (profileQuery.isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#67A8FF" />
      </View>
    );
  }

  const profile = profileQuery.data || {};
  const firstLetter = profile?.name?.trim()?.[0]?.toUpperCase() || 'U';

  return (
    <LinearGradient colors={['#0B1020', '#0F172A', '#111827']} style={styles.gradient}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.kicker}>ACCOUNT</Text>
          <Text style={styles.title}>Profile</Text>

          <View style={styles.card}>
            <Pressable style={styles.avatarWrap} onPress={handlePickAvatar}>
              {profile.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>{firstLetter}</Text>
                </View>
              )}

              {uploading ? (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              ) : null}
            </Pressable>

            <Text style={styles.avatarHint}>Tap avatar to change</Text>

            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Your name"
              placeholderTextColor="#7C8AA5"
              style={styles.input}
            />

            <Pressable style={styles.saveButton} onPress={handleSaveName}>
              <Text style={styles.saveButtonText}>
                {saveMutation.isPending ? 'Saving...' : 'Save profile'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile.email || '-'}</Text>
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
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

  title: {
    color: '#F7FAFF',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 20,
  },

  card: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    marginBottom: 14,
  },

  avatarWrap: {
    marginBottom: 10,
    position: 'relative',
  },

  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },

  avatarPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#17233A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(103,168,255,0.2)',
  },

  avatarLetter: {
    color: '#DCEBFF',
    fontSize: 30,
    fontWeight: '800',
  },

  avatarLoading: {
    position: 'absolute',
    inset: 0,
    borderRadius: 46,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarHint: {
    color: '#8EA4C8',
    marginBottom: 14,
  },

  input: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0E1628',
    borderWidth: 1,
    borderColor: 'rgba(103,168,255,0.15)',
    color: '#F4F8FF',
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 12,
  },

  saveButton: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },

  infoCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },

  infoLabel: {
    color: '#8EA4C8',
    fontSize: 13,
    marginBottom: 6,
  },

  infoValue: {
    color: '#F4F8FF',
    fontSize: 16,
    fontWeight: '600',
  },

  logoutButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  logoutText: {
    color: '#fff',
    fontWeight: '700',
  },
});