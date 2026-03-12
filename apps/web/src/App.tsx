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

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api` });

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

  useEffect(() => {
    const load = async () => {
      if (!orderId || !paymentIntentId) return;
      const [{ data: orderData }, { data: paymentData }] = await Promise.all([
        api.get(`/orders/${orderId}`),
        api.get(`/payments/intents/${paymentIntentId}`),
      ]);
      setOrder(orderData);
      setPaymentIntent(paymentData);
      setStatus(paymentData.status === 'Confirmed' ? 'Payment confirmed' : 'Wallet connection required');
    };
    load().catch(() => setStatus('Failed to load payment screen'));
  }, [orderId, paymentIntentId]);

  const bindWallet = async () => {
    if (!wallet || !telegramId) return;
    await api.patch(`/users/${telegramId}/wallet`, { walletAddress: wallet.account.address });
  };

  useEffect(() => {
    bindWallet().catch(() => undefined);
  }, [wallet]);

  const confirmPayment = async () => {
    if (!paymentIntent) return;
    setBusy(true);
    try {
      setStatus('Opening wallet confirmation...');
      await tonConnectUI.sendTransaction(paymentIntent.tonConnectPayload);
      setStatus('Wallet approved. Confirming order...');

      // Demo confirmation path. Replace with real verification in TonVerificationService.
      await api.post('/payments/confirm', { paymentIntentId: paymentIntent.id });
      setStatus('Payment confirmed. Your order is now in progress. Return to Telegram.');
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data);
    } catch (error) {
      setStatus('Payment was canceled or failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="card hero">
        <div>
          <p className="eyebrow">Nauvvi</p>
          <h1>Pay in TON</h1>
          <p className="subtle">Telegram-native AI services for creators, sellers, and channel owners.</p>
        </div>
        <TonConnectButton />
      </div>

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
          <div className="detail-row"><span>Receiver</span><code>{paymentIntent.destinationAddress}</code></div>
          <div className="detail-row"><span>Comment</span><code>{paymentIntent.paymentComment}</code></div>
          <div className="detail-row"><span>Network</span><code>{import.meta.env.VITE_TON_NETWORK || 'testnet'}</code></div>
        </div>
      )}

      <div className="card accent">
        <p className="eyebrow">Current status</p>
        <h3>{status}</h3>
        <button disabled={!wallet || !paymentIntent || busy} onClick={confirmPayment} className="primary-button">
          {busy ? 'Processing...' : 'Confirm payment'}
        </button>
        {!wallet && <p className="hint">Connect a TON wallet to continue.</p>}
      </div>
    </div>
  );
}
