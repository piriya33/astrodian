import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/sync/profiles/[id] — Delete a profile
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: 'Cloud sync not configured' }, { status: 503 });
    }

    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // RLS: only own profiles

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Sync] Profile delete error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
