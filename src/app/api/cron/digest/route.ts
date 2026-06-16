import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Compute current hour in America/New_York
  const nyTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  const nyHour = new Date(nyTime).getHours()
  
  // No-op unless it equals 7 (handles EST/EDT drift)
  if (nyHour !== 7) {
    return NextResponse.json({ status: 'skipped', message: 'Not 7 AM in NY' })
  }

  // POST to ZAPIER_DIGEST_WEBHOOK_URL
  const webhookUrl = process.env.ZAPIER_DIGEST_WEBHOOK_URL
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'test@example.com', // Stub
          subject: 'Weekly Digest', // Stub
          html: '<p>Digest HTML content here</p>' // Stub
        })
      })
    } catch (e) {
      console.error('Failed to post to Zapier webhook', e)
    }
  }

  // TODO: Phase 2 implementation
  // For each user, expand subscriptions
  // Pull trailing-7-day activity_log
  // Render branded HTML email (React Email)

  return NextResponse.json({ status: 'success', message: 'Digest cron executed' })
}
