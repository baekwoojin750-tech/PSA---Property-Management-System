import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { GlobalDialogProvider } from './components/ui/GlobalDialog'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <GlobalDialogProvider>
        <App />
      </GlobalDialogProvider>
    </BrowserRouter>
  </React.StrictMode>
)
