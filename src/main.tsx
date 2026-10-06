import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function mount() {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    createRoot(rootEl).render(<App />);
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      const el = document.getElementById('root');
      if (el) createRoot(el).render(<App />);
    });
  }
}

mount();
