'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  isLoading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

/**
 * React hook for auth state management
 * Per backend-design-manual.md §9.1
 * 
 * Guest-first: works fully without account.
 * Account = sync bonus (cross-device).
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isGuest = !user;

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        setSession(s);
        setUser(s?.user ?? null);

        // On first sign-in, migrate localStorage → cloud
        if (event === 'SIGNED_IN' && s?.user && !localStorage.getItem('pekky_migrated')) {
          await migrateLocalToCloud(s.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return { user, session, isGuest, isLoading, signInWithMagicLink, signOut };
}

/**
 * Migrate localStorage data → Supabase cloud
 * Per backend-design-manual.md §4.3
 */
async function migrateLocalToCloud(userId: string) {
  try {
    // 1. Migrate profiles
    const localProfiles = JSON.parse(localStorage.getItem('nox_profiles') || '[]');
    for (const p of localProfiles) {
      await supabase.from('user_profiles').insert({
        user_id: userId,
        display_name: p.name || p.displayName || 'Profile',
        birth_date_enc: p.birthDateStr, // Will be encrypted server-side on sync
        birth_time_enc: p.birthTimeStr,
        lat: p.lat,
        lon: p.lon,
        location_name: p.locationName || null
      });
    }

    // 2. Migrate reading history
    const localHistory = JSON.parse(localStorage.getItem('pekky_reading_history') || '[]');
    for (const r of localHistory) {
      await supabase.from('readings').insert({
        user_id: userId,
        mode: r.mode || 'daily',
        persona: r.persona || 'expert',
        reading_text: r.reading || '',
        astro_data: r.astrology || null,
        created_at: r.date || new Date().toISOString()
      });
    }

    // 3. Mark migration complete
    localStorage.setItem('pekky_migrated', 'true');
    console.log('[Auth] localStorage → cloud migration complete');
  } catch (err) {
    console.error('[Auth] Migration error:', err);
  }
}

/**
 * Load profiles — cloud-first, localStorage fallback
 * Per backend-design-manual.md §9.2
 */
export async function loadProfiles(user: User | null): Promise<any[]> {
  if (user && isSupabaseConfigured()) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at');
    return data || [];
  }
  // Guest mode — localStorage fallback
  return JSON.parse(localStorage.getItem('nox_profiles') || '[]');
}
