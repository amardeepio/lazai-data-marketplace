import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { WalletProvider } from './components/WalletContext.jsx' // <-- Import the provider

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WalletProvider> {/* <-- Add the provider here */}
      <App />
    </WalletProvider> {/* <-- And close it here */}
  </React.StrictMode>,
)