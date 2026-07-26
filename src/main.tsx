import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import ShareApp from './ShareApp.tsx';
import { SHARE_MODE } from './lib/mode';

createRoot(document.getElementById('root')!).render(
  <StrictMode>{SHARE_MODE ? <ShareApp /> : <App />}</StrictMode>,
);
