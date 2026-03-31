import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import RootNavigator from './src/navigation/RootNavigator';
import useAuthStore, { initAuthListener } from './src/store/authStore';
import { getCurrentSession } from './src/services/auth';

const queryClient = new QueryClient();

function Bootstrap() {
  const { loading, setSession, setLoading } = useAuthStore();

  useEffect(() => {
    let subscription;

    async function bootstrap() {
      try {
        const session = await getCurrentSession();
        setSession(session);
        subscription = initAuthListener();
      } catch (e) {
        console.log('Bootstrap auth error:', e.message);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [setSession, setLoading]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Bootstrap />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}