import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync/readings — Fetch reading history (paginated)
 * POST /api/sync/readings — Save a new reading
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

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from('readings')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      readings: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('[Sync] Readings fetch error:', error);
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
    const { mode, persona, reading_text, astro_data, profile_id, amount_sats, amount_thb, payment_method } = body;

    if (!mode || !reading_text) {
      return NextResponse.json({ success: false, error: 'Missing required fields (mode, reading_text)' }, { status: 400 });
    }

    // Check max readings limit (50)
    const { count } = await supabaseAdmin
      .from('readings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((count || 0) >= 50) {
      // Delete oldest reading to make room
      const { data: oldest } = await supabaseAdmin
        .from('readings')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (oldest) {
        await supabaseAdmin.from('readings').delete().eq('id', oldest.id);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('readings')
      .insert({
        user_id: userId,
        profile_id: profile_id || null,
        mode,
        persona: persona || 'expert',
        reading_text,
        astro_data: astro_data || null,
        amount_sats: amount_sats || 0,
        amount_thb: amount_thb || 0,
        payment_method: payment_method || null
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, reading: data });
  } catch (error: any) {
    console.error('[Sync] Reading save error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
