import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

export interface CheckoutResult {
  success: boolean;
  message?: string;
}

const BACKEND_URL = 'https://YOUR_BACKEND_URL';
const TEST_CHECKOUT_URL = 'https://buy.stripe.com/test_4gw00y8Wf1kbfWc6oo';

async function openUrl(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}

export async function startStripeCheckout(): Promise<CheckoutResult> {
  try {
    const hasBackend = BACKEND_URL && BACKEND_URL.startsWith('https://') && !BACKEND_URL.includes('YOUR_BACKEND_URL');

    if (hasBackend) {
      const res = await fetch(`${BACKEND_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium_monthly' }),
      });
      if (!res.ok) {
        const text = await res.text();
        return { success: false, message: `Checkout error: ${text}` };
      }
      const data = (await res.json()) as { url?: string; sessionId?: string };
      const url = data.url ?? TEST_CHECKOUT_URL;
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

    await openUrl(TEST_CHECKOUT_URL);
    return { success: true };
  } catch (e) {
    console.log('[payments] startStripeCheckout error', e);
    return { success: false, message: 'Unable to start checkout.' };
  }
}
