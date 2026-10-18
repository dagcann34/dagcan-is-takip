import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { App } from './App';
import { isDesktop } from './lib/platform';
import './styles/index.css';

const QuickCapture = lazy(() => import('./features/quick/QuickCapture').then((m) => ({ default: m.QuickCapture })));

// Aynı paket iki pencereye hizmet eder; Tauri pencere etiketi hangisinin çizileceğini belirler.
const isQuickWindow = isDesktop && getCurrentWindow().label === 'quick';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isQuickWindow ? (
      <Suspense>
        <QuickCapture />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
