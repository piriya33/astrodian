import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { encrypt, decrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync/profiles — Fetch all user profiles
 * POST /api/sync/profiles — Create a new profile
 * Per backend-design-manual.md §5.2
 */

export async function GET(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Cloud sync not configured' }, { status: 503 });
    }

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');

    if (error) throw error;

    // Decrypt birth data before sending to client
    const profiles = (data || []).map(p => {
      try {
        return {
          ...p,
          birth_date: process.env.ENCRYPTION_KEY ? decrypt(p.birth_date_enc) : p.birth_date_enc,
          birth_time: process.env.ENCRYPTION_KEY ? decrypt(p.birth_time_enc) : p.birth_time_enc,
          birth_date_enc: undefined,
          birth_time_enc: undefined,
        };
      } catch {
        return { ...p, birth_date: '[encrypted]', birth_time: '[encrypted]' };
      }
    });

    return NextResponse.json({ success: true, profiles });
  } catch (error: any) {
    console.error('[Sync] Profiles fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Cloud sync not configured' }, { status: 503 });
    }

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { display_name, birth_date, birth_time, lat, lon, location_name, is_default } = body;

    if (!display_name || !birth_date || !birth_time || lat === undefined || lon === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Check max profiles limit (5)
    const { count } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((count || 0) >= 5) {
      return NextResponse.json({ success: false, error: 'Maximum 5 profiles allowed' }, { status: 400 });
    }

    // Encrypt PII before storing
    const birth_date_enc = process.env.ENCRYPTION_KEY ? encrypt(birth_date) : birth_date;
    const birth_time_enc = process.env.ENCRYPTION_KEY ? encrypt(birth_time) : birth_time;

    // If setting as default, unset other defaults
    if (is_default) {
      await supabaseAdmin
        .from('user_profiles')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: userId,
        display_name,
        birth_date_enc,
        birth_time_enc,
        lat, lon,
        location_name: location_name || null,
        is_default: is_default || false
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, profile: data });
  } catch (error: any) {
    console.error('[Sync] Profile create error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
