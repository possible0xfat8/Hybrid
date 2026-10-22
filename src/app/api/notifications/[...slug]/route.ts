import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/server/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const recipientId = slug?.[0];

  const client = getSupabase();
  if (!client || !recipientId) {
    return NextResponse.json({ notifications: [] });
  }

  try {
    const { data } = await client
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false })
      .limit(30);

    return NextResponse.json({ notifications: data || [] });
  } catch (err) {
    console.warn('[API:Notifications] Error:', err);
    return NextResponse.json({ notifications: [] });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const id = slug?.[0];
  const action = slug?.[1]; // e.g. 'read', 'clear', 'status'

  const client = getSupabase();
  if (!client) return NextResponse.json({ success: true });

  try {
    if (action === 'read' && id) {
      await client
        .from('notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', id);
    } else if (action === 'clear' && id) {
      await client
        .from('notifications')
        .delete()
        .eq('recipient_id', id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.warn('[API:Notifications] Post error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const id = slug?.[0];

  const client = getSupabase();
  if (!client || !id) return NextResponse.json({ success: true });

  try {
    await client.from('notifications').delete().eq('id', id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
