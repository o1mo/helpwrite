import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import { RecallProvider } from "./context/RecallContext"
import "./index.css"

const root = document.getElementById("root")
if (!root) throw new Error("Root element not found")

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <RecallProvider>
      <App />
    </RecallProvider>
  </React.StrictMode>
) 