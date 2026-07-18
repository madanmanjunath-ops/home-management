import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { StoreProvider } from './store'
import { DEMO } from './demo/mock'
import { App } from './App'
import './index.css'

// Hosted preview: hash routing (safe inside the artifact iframe) and a
// pre-signed-in owner session so it opens straight on the dashboard.
if (DEMO && !localStorage.getItem('griha.session')) {
  localStorage.setItem(
    'griha.session',
    JSON.stringify({
      token: 'demo',
      role: 'owner',
      user: { id: 'u_demo', name: 'Madan', email: 'owner@griha.app' },
      household: { id: 'h_demo', name: 'Madan’s Home', joinCode: 'HOME24' },
    })
  )
}

const Router = DEMO ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <StoreProvider>
        <App />
      </StoreProvider>
    </Router>
  </React.StrictMode>
)
