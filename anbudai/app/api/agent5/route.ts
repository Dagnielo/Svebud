import { NextRequest, NextResponse } from 'next/server'
import { körDagligUppföljning } from '@/lib/followup-agent'

export async function POST(request: NextRequest) {
  // Verifiera CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ fel: 'Unauthorized' }, { status: 401 })
  }

  try {
    const resultat = await körDagligUppföljning()
    return NextResponse.json(resultat)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ fel: message }, { status: 500 })
  }
}
