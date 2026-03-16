import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { App } from './App';
import './styles.css';

const manifestUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/tonconnect-manifest.json`;

console.log('manifestUrl =', manifestUrl);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>,
);