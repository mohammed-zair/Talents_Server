import React from 'react';
import ReactDOM from 'react-dom';

import './index.css';
import App from './App';
import { ContextProvider } from './contexts/ContextProvider';
import { ToastProvider } from './components';

ReactDOM.render(
  <React.StrictMode>
    <ContextProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ContextProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);
