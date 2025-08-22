import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export type PaymentGateway = 'paypal' | 'stripe';

export interface CheckoutResult {
  success: boolean;
  message?: string;
}

export interface CheckoutOptions {
  planId: string;
  currency: string;
  amountCents: number;
  promoCode?: string;
  gateway?: PaymentGateway;
  mode?: 'subscription' | 'one_time';
}

const BACKEND_URL = 'https://YOUR_BACKEND_URL';
const TEST_STRIPE_URL = 'https://buy.stripe.com/test_4gw00y8Wf1kbfWc6oo';
const TEST_PAYPAL_SUBSCRIBE_URL = 'https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=BA-TEST-TOKEN';
const TEST_PAYPAL_CHECKOUT_URL = 'https://www.sandbox.paypal.com/checkoutnow?token=EC-TEST-TOKEN';

async function openUrl(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}

export async function startCheckout(opts: CheckoutOptions): Promise<CheckoutResult> {
  const gateway: PaymentGateway = opts.gateway ?? 'paypal';
  if (gateway === 'paypal') return startPayPalCheckout(opts);
  return startStripeCheckoutWithOptions(opts);
}

export async function startStripeCheckout(): Promise<CheckoutResult> {
  return startStripeCheckoutWithOptions({ planId: 'premium_monthly', currency: 'USD', amountCents: 999, gateway: 'stripe', mode: 'subscription' });
}

export async function startStripeCheckoutWithOptions(opts: CheckoutOptions): Promise<CheckoutResult> {
  try {
    console.log('[payments] startStripeCheckoutWithOptions', opts);
    const hasBackend = BACKEND_URL && BACKEND_URL.startsWith('https://') && !BACKEND_URL.includes('YOUR_BACKEND_URL');

    if (hasBackend) {
      const res = await fetch(`${BACKEND_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: opts.planId, currency: opts.currency, amountCents: opts.amountCents, promoCode: opts.promoCode, mode: opts.mode ?? 'subscription' }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, message: `Checkout error: ${text}` };
      }
      const data = (await res.json()) as { url?: string; sessionId?: string };
      const url = data.url ?? TEST_STRIPE_URL;
      await openUrl(url);

      if (data.sessionId) {
        try {
          const statusRes = await fetch(`${BACKEND_URL}/api/stripe/session-status?sessionId=${encodeURIComponent(data.sessionId)}`);
          if (statusRes.ok) {
            const status = (await statusRes.json()) as { paid: boolean };
            if (status.paid) return { success: true };
          }
        } catch {}
        return { success: false, message: 'Complete payment in the opened browser, then return to the app.' };
      }

      return { success: true };
    }

    await openUrl(TEST_STRIPE_URL);
    return { success: true };
  } catch (e) {
    console.log('[payments] startStripeCheckout error', e);
    return { success: false, message: 'Unable to start checkout.' };
  }
}

export async function startPayPalCheckout(opts: CheckoutOptions): Promise<CheckoutResult> {
  try {
    console.log('[payments] startPayPalCheckout', opts);
    const hasBackend = BACKEND_URL && BACKEND_URL.startsWith('https://') && !BACKEND_URL.includes('YOUR_BACKEND_URL');

    if (hasBackend) {
      const endpoint = opts.mode === 'one_time' ? '/api/paypal/create-order' : '/api/paypal/create-subscription';
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: opts.planId, currency: opts.currency, amountCents: opts.amountCents, promoCode: opts.promoCode }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, message: `PayPal error: ${text}` };
      }
      const data = (await res.json()) as { approveUrl?: string; id?: string };
      const url = data.approveUrl ?? (opts.mode === 'one_time' ? TEST_PAYPAL_CHECKOUT_URL : TEST_PAYPAL_SUBSCRIBE_URL);
      await openUrl(url);

      if (data.id) {
        try {
          const statusRes = await fetch(`${BACKEND_URL}/api/paypal/status?id=${encodeURIComponent(data.id)}`);
          if (statusRes.ok) {
            const status = (await statusRes.json()) as { approved: boolean };
            if (status.approved) return { success: true };
          }
        } catch {}
        return { success: false, message: 'Approve payment in the opened PayPal page, then return to the app.' };
      }

      return { success: true };
    }

    const fallback = opts.mode === 'one_time' ? TEST_PAYPAL_CHECKOUT_URL : TEST_PAYPAL_SUBSCRIBE_URL;
    await openUrl(fallback);
    return { success: true };
  } catch (e) {
    console.log('[payments] startPayPalCheckout error', e);
    return { success: false, message: 'Unable to start PayPal checkout.' };
  }
}

export async function openBillingPortal(): Promise<void> {
  try {
    const hasBackend = BACKEND_URL && BACKEND_URL.startsWith('https://') && !BACKEND_URL.includes('YOUR_BACKEND_URL');
    if (!hasBackend) {
      await openUrl('https://www.sandbox.paypal.com/myaccount/autopay/');
      return;
    }
    const res = await fetch(`${BACKEND_URL}/api/payments/billing-portal`, { method: 'POST' });
    if (res.ok) {
      const data = (await res.json()) as { url?: string };
      if (data.url) await openUrl(data.url);
      return;
    }
    await openUrl('https://www.sandbox.paypal.com/myaccount/autopay/');
  } catch (e) {
    console.log('[payments] openBillingPortal error', e);
  }
}
