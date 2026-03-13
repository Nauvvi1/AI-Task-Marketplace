import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

type Order = {
  id: string;
  publicOrderNo: string;
  status: string;
  priceTon: string;
  service: { title: string };
  summaryJson?: Record<string, unknown>;
};

type PaymentIntent = {
  id: string;
  amountTon: string;
  destinationAddress: string;
  paymentComment: string;
  tonConnectPayload: {
    validUntil: number;
    messages: { address: string; amount: string; payload?: string }[];
  };
  status: string;
};

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api`,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

export function App() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const orderId = params.get('orderId');
  const paymentIntentId = params.get('paymentIntentId');
  const telegramId = params.get('telegramId');

  const [order, setOrder] = useState<Order | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [status, setStatus] = useState('Preparing payment...');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);

  const hasPaymentContext = Boolean(orderId && paymentIntentId);

  const refreshOrderState = async () => {
    if (!orderId || !paymentIntentId) return;

    const [{ data: updatedOrder }, { data: updatedIntent }] = await Promise.all([
      api.get(`/orders/${orderId}`),
      api.get(`/payments/intents/${paymentIntentId}`),
    ]);

    setOrder(updatedOrder);
    setPaymentIntent(updatedIntent);

    if (updatedOrder.status === 'Completed') {
      setStatus('Order completed. Return to Telegram to view the result.');
      setPaymentDone(true);
      return;
    }

    if (updatedOrder.status === 'InProgress') {
      setStatus('Payment confirmed. AI generation is in progress...');
      setPaymentDone(true);
      return;
    }

    if (updatedIntent.status === 'Confirmed') {
      setStatus('Payment confirmed. Waiting for generation...');
      setPaymentDone(true);
      return;
    }

    if (wallet) {
      setStatus('Wallet connected. Ready to confirm payment.');
    } else {
      setStatus('Wallet connection required');
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!hasPaymentContext) {
        setStatus('No active payment selected');
        return;
      }

      setLoadError(null);
      setStatus('Loading payment screen...');

      const [{ data: orderData }, { data: paymentData }] = await Promise.all([
        api.get(`/orders/${orderId}`),
        api.get(`/payments/intents/${paymentIntentId}`),
      ]);

      if (
        !orderData ||
        typeof orderData !== 'object' ||
        !orderData.service ||
        !paymentData ||
        typeof paymentData !== 'object' ||
        !paymentData.tonConnectPayload
      ) {
        throw new Error('Invalid payment screen payload');
      }

      setOrder(orderData);
      setPaymentIntent(paymentData);

      if (orderData.status === 'Completed') {
        setStatus('Order completed. Return to Telegram to view the result.');
        setPaymentDone(true);
      } else if (paymentData.status === 'Confirmed') {
        setStatus('Payment confirmed. Waiting for generation...');
        setPaymentDone(true);
      } else if (wallet) {
        setStatus('Wallet connected. Ready to confirm payment.');
      } else {
        setStatus('Wallet connection required');
      }
    };

    load().catch((error) => {
      console.error('Failed to load payment screen:', error);
      setLoadError('Failed to load payment screen');
      setStatus('Failed to load payment screen');
      setOrder(null);
      setPaymentIntent(null);
    });
  }, [orderId, paymentIntentId, hasPaymentContext, wallet]);

  useEffect(() => {
    if (!hasPaymentContext || !orderId || !paymentIntentId) return;
    if (order?.status === 'Completed') return;
    if (!paymentDone) return;

    const interval = setInterval(() => {
      refreshOrderState().catch((error) => {
        console.error('Failed to refresh order state:', error);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [hasPaymentContext, orderId, paymentIntentId, order?.status, paymentDone]);

  const bindWallet = async () => {
    if (!wallet || !telegramId) return;
    await api.patch(`/users/${telegramId}/wallet`, {
      walletAddress: wallet.account.address,
    });
  };

  useEffect(() => {
    bindWallet().catch((error) => {
      console.error('Failed to bind wallet:', error);
    });
  }, [wallet, telegramId]);

  const confirmPayment = async () => {
    if (!paymentIntent || paymentDone || order?.status === 'Completed') return;

    setBusy(true);

    try {
      setStatus('Opening wallet confirmation...');

      // MVP demo mode:
      // await tonConnectUI.sendTransaction(paymentIntent.tonConnectPayload);

      setStatus('Wallet approved. Confirming order...');

      await api.post('/payments/confirm', {
        paymentIntentId: paymentIntent.id,
      });

      setPaymentDone(true);
      await refreshOrderState();
    } catch (error) {
      console.error('Payment confirmation failed:', error);
      setStatus('Payment was canceled or failed.');
    } finally {
      setBusy(false);
    }
  };

  const buttonDisabled =
    !wallet ||
    !paymentIntent ||
    busy ||
    paymentDone ||
    paymentIntent?.status === 'Confirmed' ||
    order?.status === 'Completed';

  const buttonText = order?.status === 'Completed'
    ? 'Payment confirmed'
    : busy
    ? 'Processing...'
    : paymentDone
    ? 'Payment confirmed'
    : 'Confirm payment';

  return (
    <div className="page">
      <div className="card hero">
        <div>
          <p className="eyebrow">Nauvvi</p>
          <h1>Pay in TON</h1>
          <p className="subtle">
            Telegram-native AI services for creators, sellers, and channel owners.
          </p>
        </div>
        <TonConnectButton />
      </div>

      {!hasPaymentContext && (
        <div className="card">
          <p className="eyebrow">Wallet / Pay</p>
          <h2>No active payment selected</h2>
          <p className="subtle">
            Create an order in the Telegram bot first, then open payment from the order card.
          </p>
        </div>
      )}

      {loadError && hasPaymentContext && (
        <div className="card">
          <p className="eyebrow">Error</p>
          <h2>{loadError}</h2>
          <p className="subtle">
            Check that <code>VITE_API_BASE_URL</code> points to a public API URL and that the backend is reachable.
          </p>
        </div>
      )}

      {order && (
        <div className="card">
          <p className="eyebrow">Order</p>
          <h2>{order.service.title}</h2>
          <p className="subtle">#{order.publicOrderNo}</p>

          <div className="grid two">
            <div className="metric">
              <span>Status</span>
              <strong>{order.status}</strong>
            </div>
            <div className="metric">
              <span>Price</span>
              <strong>{order.priceTon} TON</strong>
            </div>
          </div>
        </div>
      )}

      {paymentIntent && (
        <div className="card">
          <p className="eyebrow">Payment intent</p>
          <div className="detail-row">
            <span>Receiver</span>
            <code>{paymentIntent.destinationAddress}</code>
          </div>
          <div className="detail-row">
            <span>Comment</span>
            <code>{paymentIntent.paymentComment}</code>
          </div>
          <div className="detail-row">
            <span>Network</span>
            <code>{import.meta.env.VITE_TON_NETWORK || 'testnet'}</code>
          </div>
        </div>
      )}

      {hasPaymentContext && (
        <div className="card accent">
          <p className="eyebrow">Current status</p>
          <h3>{status}</h3>

          <button
            disabled={buttonDisabled}
            onClick={confirmPayment}
            className="primary-button"
          >
            {buttonText}
          </button>

          {!wallet && <p className="hint">Connect a TON wallet to continue.</p>}
        </div>
      )}
    </div>
  );
}