import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";   // THIS is the Tailwind entry

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, background: '#111', color: '#ff4444', height: '100vh', width: '100vw', overflow: 'auto', boxSizing: 'border-box' }}>
          <h2>CRITICAL REACT CRASH!</h2>
          <p>Please copy this entire box and send it to the AI:</p>
          <pre style={{ background: '#000', padding: 20, whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <pre style={{ background: '#000', padding: 20, whiteSpace: 'pre-wrap', marginTop: 10 }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);
