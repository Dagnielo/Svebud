import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Använd service role key för webhooks (ej user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ fel: 'Ogiltig signatur' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const tier = session.metadata?.tier

      if (userId && tier) {
        await supabase.from('profiler').upsert({
          id: userId,
          tier,
          stripe_customer_id: session.customer as string,
        })

        // Uppdatera även projekt-tabellen
        await supabase
          .from('projekt')
          .update({ tier, prenumeration_status: 'active' })
          .eq('användar_id', userId)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await supabase
        .from('profiler')
        .update({ tier: 'trial' })
        .eq('stripe_customer_id', customerId)
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      await supabase
        .from('profiler')
        .update({ tier: 'past_due' })
        .eq('stripe_customer_id', customerId)
    }

    return NextResponse.json({ mottagen: true })

  } catch (error) {
    console.error('Webhook handling error:', error)
    return NextResponse.json({ fel: 'Webhook-fel' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
