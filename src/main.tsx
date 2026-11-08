import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles/index.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('ALLXCHAT root element is missing.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
