import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // TODO: Phase 2 implementation
  // For each user, expand subscriptions
  // Pull trailing-7-day activity_log
  // Render branded HTML email (React Email)
  // POST to ZAPIER_DIGEST_WEBHOOK_URL sequentially

  return NextResponse.json({ status: 'success', message: 'Digest cron executed (Phase 2 stub)' })
}
