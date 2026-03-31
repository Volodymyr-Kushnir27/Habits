import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useAuthStore = create((set) => ({
  session: null,
  user: null,
  loading: true,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      loading: false,
    }),

  setLoading: (loading) => set({ loading }),
  clearAuth: () => set({ session: null, user: null, loading: false }),
}));

export function initAuthListener() {
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });

  return listener?.subscription;
}

export default useAuthStore;