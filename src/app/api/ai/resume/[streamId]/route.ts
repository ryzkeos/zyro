import { err, json, withOptionalAuth } from '@/server/http';
import { getStream } from '@/server/ai/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withOptionalAuth<{ streamId: string }>(async (_req, _user, { params }) => {
  const { streamId } = await params;
  const text = await getStream(streamId);
  if (!text) return err('Stream not found or expired.', 404);
  return json({ text });
});
