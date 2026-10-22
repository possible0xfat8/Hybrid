import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/server/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const userId = slug?.[0];

  const client = getSupabase();
  if (!client || !userId) {
    return NextResponse.json({ friends: [], incomingRequests: [], sentRequests: [] });
  }

  try {
    const { data: friendsData } = await client
      .from('crazy8_friends')
      .select('friend_id, crazy8_profiles!crazy8_friends_friend_id_fkey(*)')
      .eq('user_id', userId);

    const { data: incoming } = await client
      .from('crazy8_friend_requests')
      .select('sender_id, crazy8_profiles!crazy8_friend_requests_sender_id_fkey(*)')
      .eq('receiver_id', userId)
      .eq('status', 'pending');

    const { data: sent } = await client
      .from('crazy8_friend_requests')
      .select('receiver_id, crazy8_profiles!crazy8_friend_requests_receiver_id_fkey(*)')
      .eq('sender_id', userId)
      .eq('status', 'pending');

    return NextResponse.json({
      friends: (friendsData || []).map((f: any) => f.crazy8_profiles).filter(Boolean),
      incomingRequests: (incoming || []).map((i: any) => i.crazy8_profiles).filter(Boolean),
      sentRequests: (sent || []).map((s: any) => s.crazy8_profiles).filter(Boolean),
    });
  } catch (err) {
    console.warn('[API:Friends] Error:', err);
    return NextResponse.json({ friends: [], incomingRequests: [], sentRequests: [] });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const action = slug?.[0]; // 'request', 'accept', 'decline', 'remove'
  const body = await req.json().catch(() => ({}));
  const { userId, targetId, senderId, receiverId, friendId } = body;

  const client = getSupabase();
  if (!client) {
    return NextResponse.json({ success: true });
  }

  try {
    const sId = userId || senderId;
    const rId = targetId || receiverId || friendId;

    if (action === 'request' && sId && rId) {
      await client.from('crazy8_friend_requests').upsert({
        sender_id: sId,
        receiver_id: rId,
        status: 'pending',
        created_at: Date.now(),
      });
    } else if (action === 'accept' && sId && rId) {
      await client.from('crazy8_friends').upsert([
        { user_id: sId, friend_id: rId, created_at: Date.now() },
        { user_id: rId, friend_id: sId, created_at: Date.now() },
      ]);
      await client
        .from('crazy8_friend_requests')
        .delete()
        .or(`and(sender_id.eq.${sId},receiver_id.eq.${rId}),and(sender_id.eq.${rId},receiver_id.eq.${sId})`);
    } else if (action === 'decline' && sId && rId) {
      await client
        .from('crazy8_friend_requests')
        .delete()
        .or(`and(sender_id.eq.${sId},receiver_id.eq.${rId}),and(sender_id.eq.${rId},receiver_id.eq.${sId})`);
    } else if (action === 'remove' && sId && rId) {
      await client
        .from('crazy8_friends')
        .delete()
        .or(`and(user_id.eq.${sId},friend_id.eq.${rId}),and(user_id.eq.${rId},friend_id.eq.${sId})`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.warn('[API:Friends] Action error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
