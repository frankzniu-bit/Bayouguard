/* Flood-alert sign-ups. PLANNED backend endpoint. Until it exists nothing is
 * stored: the response says demo and the page tells the visitor alerts
 * aren't active yet. */

import { NextResponse } from 'next/server';
import { postSubscribe } from '@/lib/endpoints';
import type { SubscribeRequest } from '@/lib/contract';

export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: SubscribeRequest;
  try {
    body = (await request.json()) as SubscribeRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const phoneDigits = (body.phone ?? '').replace(/\D/g, '');
  const hasPhone = phoneDigits.length === 10;
  const hasEmail = typeof body.email === 'string' && EMAIL.test(body.email);
  const addresses = Array.isArray(body.addresses)
    ? body.addresses.filter((a) => typeof a === 'string' && a.trim()).slice(0, 3)
    : [];
  if ((!hasPhone && !hasEmail) || addresses.length === 0) {
    return NextResponse.json({ error: 'A phone or email and at least one address are required' }, { status: 400 });
  }
  const clean: SubscribeRequest = {
    phone: hasPhone ? phoneDigits : undefined,
    email: hasEmail ? body.email : undefined,
    addresses,
    threshold: body.threshold === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
    lang: body.lang === 'es' || body.lang === 'vi' ? body.lang : 'en',
    allClear: body.allClear !== false,
  };
  const ok = await postSubscribe(clean);
  return NextResponse.json({ ok, source: ok ? 'live' : 'demo' });
}
