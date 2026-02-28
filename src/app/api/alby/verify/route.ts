import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentHash = searchParams.get('payment_hash');

    if (!paymentHash) {
      return NextResponse.json({ error: 'payment_hash is required' }, { status: 400 });
    }

    // Handle dummy hash for local testing
    if (paymentHash.startsWith('dummy_hash_')) {
      console.log("Simulating payment success for dummy hash.");
      return NextResponse.json({ settled: true });
    }

    if (!process.env.ALBY_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'ALBY_ACCESS_TOKEN is not configured' }, { status: 500 });
    }

    const response = await fetch(`https://api.getalby.com/invoices/${paymentHash}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.ALBY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alby Verify Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // data.settled returns true if the invoice has been paid
    return NextResponse.json({
      settled: data.settled,
      settled_at: data.settled_at
    });

  } catch (error: any) {
    console.error("Alby Verification Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to verify invoice' }, { status: 500 });
  }
}
