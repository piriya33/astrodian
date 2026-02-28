import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount = 50, memo = 'PEKKY AI Reading' } = await req.json();

    if (!process.env.ALBY_ACCESS_TOKEN) {
      // Return a dummy invoice for local testing if no token is provided
      console.warn("ALBY_ACCESS_TOKEN not set. Returning dummy invoice.");
      return NextResponse.json({
        payment_request: "lnbc1dummyinvoicefortestingpurposesonly...",
        payment_hash: "dummy_hash_" + Date.now(),
        amount: amount,
        description: memo
      });
    }

    const response = await fetch('https://api.getalby.com/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ALBY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: amount,
        description: memo
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Alby API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // data contains: payment_request (bolt11 string), payment_hash, etc.
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Alby Invoice Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to generate invoice' }, { status: 500 });
  }
}
