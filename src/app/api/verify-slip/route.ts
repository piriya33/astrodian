import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  try {
    const { image, expectedAmount, mode } = await req.json();

    if (!image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ success: false, error: 'AI Verification unavailable' }, { status: 500 });
    }

    // Extract base64 data
    const base64Data = image.split(',')[1] || image;

    const { text } = await generateText({
      model: google('models/gemini-2.5-flash'),
      system: `
        You are a specialized Bank Slip Verifier for the Pekky astrology app. 
        Your task is to analyze Thai bank transfer slips (PromptPay) and extract key data points. 
        
        RULES:
        1. Extract the "Amount" (ยอดเงิน).
        2. Extract the "Transaction Date & Time" (วันเวลานาม).
        3. Extract the "Reference ID" or "Transaction ID" (เลขที่อ้างอิง).
        4. Check if the "Amount" matches the Expected Amount: ${expectedAmount} THB.
        5. Return a JSON object ONLY. No conversational text.
        
        Example Output Format:
        {
          "is_valid": true,
          "amount": 10.80,
          "ref_id": "20240223X12345",
          "date": "23 Feb 2026, 10:15",
          "reason": "Successfully verified"
        }
      `,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please verify this slip for a ${mode} reading. Expected amount: ${expectedAmount} THB.`
            },
            {
              type: 'image',
              image: base64Data
            }
          ]
        }
      ]
    });

    try {
      // Clean up potential markdown code blocks from AI response
      const cleanedText = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanedText);
      
      return NextResponse.json({ 
        success: result.is_valid, 
        data: result 
      });
    } catch (parseError) {
      console.error("AI Response Parsing Error:", text);
      return NextResponse.json({ success: false, error: 'Failed to interpret slip' }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Slip Verification API Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Verification failed' }, { status: 500 });
  }
}
