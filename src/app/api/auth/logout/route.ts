import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/logout
 * Clear the current session
 */
export async function POST() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true });
    }

    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
