import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { priceId, tier } = await req.json()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })
    }

    // Kolla om användare redan har aktiv prenumeration
    const { data: profil } = await supabase
      .from('profiler')
      .select('stripe_customer_id, tier')
      .eq('id', user.id)
      .single()

    let customerId = profil?.stripe_customer_id

    // Skapa Stripe-kund om behövs
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }
      })
      customerId = customer.id

      await supabase.from('profiler').upsert({
        id: user.id,
        stripe_customer_id: customerId,
        epost: user.email
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/priser?cancelled=true`,
      metadata: { userId: user.id, tier },
      subscription_data: {
        metadata: { userId: user.id, tier }
      }
    })

    return NextResponse.json({ url: session.url })

  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ fel: 'Serverfel' }, { status: 500 })
  }
}
