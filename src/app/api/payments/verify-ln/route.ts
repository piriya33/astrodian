import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/verify-ln?hash=xxx — Poll Lightning payment status
 * Replaces the old /api/alby/verify (backward compatible)
 * Per backend-design-manual.md §5.3
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const hash = url.searchParams.get('hash');

    if (!hash) {
      return NextResponse.json({ success: false, error: 'payment_hash required' }, { status: 400 });
    }

    if (!process.env.ALBY_ACCESS_TOKEN) {
      return NextResponse.json({ success: false, error: 'Lightning not configured' }, { status: 503 });
    }

    // 1. Check with Alby
    const albyRes = await fetch(`https://api.getalby.com/invoices/${hash}`, {
      headers: {
        'Authorization': `Bearer ${process.env.ALBY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!albyRes.ok) {
      return NextResponse.json({ success: false, error: 'Failed to verify with Lightning node' }, { status: 500 });
    }

    const data = await albyRes.json();
    const settled = !!data.settled;

    // 2. Update payment ledger if confirmed
    if (settled && isSupabaseConfigured()) {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('payment_hash', hash);
    }

    return NextResponse.json({
      success: true,
      settled,
      amount: data.amount
    });
  } catch (error: any) {
    console.error('[Payments] Verify error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
