import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/line
 * Exchange LINE OAuth code for a Supabase session
 * Per backend-design-manual.md §4.2
 * 
 * Requires LINE_CHANNEL_ID and LINE_CHANNEL_SECRET env vars
 */
export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const { code, redirect_uri } = await req.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Authorization code required' },
        { status: 400 }
      );
    }

    const channelId = process.env.LINE_CHANNEL_ID;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!channelId || !channelSecret) {
      return NextResponse.json(
        { success: false, error: 'LINE Login not configured' },
        { status: 503 }
      );
    }

    // 1. Exchange code for access token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirect_uri || `${req.headers.get('origin')}/`,
        client_id: channelId,
        client_secret: channelSecret,
      })
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return NextResponse.json(
        { success: false, error: `LINE token exchange failed: ${err}` },
        { status: 400 }
      );
    }

    const tokenData = await tokenRes.json();

    // 2. Get LINE user profile
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    if (!profileRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to get LINE profile' },
        { status: 400 }
      );
    }

    const profile = await profileRes.json();
    const lineUserId = profile.userId;
    const displayName = profile.displayName;

    // 3. Create or find user in Supabase Auth by LINE ID
    // Use LINE user ID as a unique identifier (email-like format)
    const pseudoEmail = `${lineUserId}@line.pekky.app`;
    
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email === pseudoEmail || u.user_metadata?.line_id === lineUserId
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: pseudoEmail,
        email_confirm: true,
        user_metadata: {
          line_id: lineUserId,
          display_name: displayName,
          provider: 'line'
        }
      });

      if (createErr || !newUser?.user) {
        return NextResponse.json(
          { success: false, error: createErr?.message || 'Failed to create user' },
          { status: 500 }
        );
      }

      userId = newUser.user.id;
    }

    // 4. Generate a session token for the user
    // Note: In production, use Supabase's generateLink or custom JWT
    // For now, return the user info and let the client handle session
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        line_id: lineUserId,
        display_name: displayName,
        provider: 'line'
      }
    });

  } catch (error: any) {
    console.error('[Auth] LINE login error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'LINE login failed' },
      { status: 500 }
    );
  }
}
