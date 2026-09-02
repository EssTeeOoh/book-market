import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { fulfillPayment, verifyPaystackReference } from '@/lib/payments/paystack';

export async function POST(request: Request) {
  const body = await request.text();
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get('x-paystack-signature');
  if (!secretKey || !signature) return new NextResponse('Unauthorized', { status: 401 });
  const expected = crypto.createHmac('sha512', secretKey).update(body).digest('hex');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return new NextResponse('Unauthorized', { status: 401 });
  const event = JSON.parse(body) as { event?: string; data?: { reference?: string } };
  if (event.event !== 'charge.success' || !event.data?.reference) return NextResponse.json({ received: true });
  const transaction = await verifyPaystackReference(event.data.reference);
  if (!transaction || !(await fulfillPayment(event.data.reference, transaction))) return new NextResponse('Could not fulfill payment', { status: 422 });
  return NextResponse.json({ received: true });
}
