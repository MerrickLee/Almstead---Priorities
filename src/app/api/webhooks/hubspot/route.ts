import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // TODO: Phase 2 implementation
  // Auto-create bottom-appended items tagged with source 'hubspot'
  
  return NextResponse.json({ status: 'success', message: 'HubSpot webhook received (Phase 2 stub)' })
}
