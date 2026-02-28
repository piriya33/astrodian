import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payments/invoice — Generate Lightning invoice
 * Replaces the old /api/alby/invoice (backward compatible)
 * Per backend-design-manual.md §5.3
 */
export async function POST(req: Request) {
  try {
    const { amount, memo, user_id } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
    }

    if (!process.env.ALBY_ACCESS_TOKEN) {
      return NextResponse.json({ success: false, error: 'Lightning not configured' }, { status: 503 });
    }

    // 1. Create Lightning invoice via Alby
    const albyRes = await fetch('https://api.getalby.com/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ALBY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount, // in sats
        description: memo || `Pekky Reading (${amount} sats)`
      })
    });

    if (!albyRes.ok) {
      const err = await albyRes.text();
      return NextResponse.json({ success: false, error: `Alby error: ${err}` }, { status: 500 });
    }

    const invoiceData = await albyRes.json();

    // 2. Record payment in ledger (if Supabase configured)
    if (isSupabaseConfigured()) {
      await supabaseAdmin.from('payments').insert({
        user_id: user_id || null,
        method: 'lightning',
        amount_sats: amount,
        status: 'pending',
        payment_hash: invoiceData.payment_hash
      });
    }

    return NextResponse.json({
      success: true,
      payment_request: invoiceData.payment_request,
      payment_hash: invoiceData.payment_hash
    });
  } catch (error: any) {
    console.error('[Payments] Invoice error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
