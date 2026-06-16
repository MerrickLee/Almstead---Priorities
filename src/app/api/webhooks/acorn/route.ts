import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // TODO: Phase 2 implementation
  // Auto-create bottom-appended items tagged with source 'acorn'
  
  return NextResponse.json({ status: 'success', message: 'Acorn webhook received (Phase 2 stub)' })
}
