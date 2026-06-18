import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'white', background: 'red' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString() || 'No error message available'}</pre>
          <pre>{this.state.error?.stack || 'No stack trace available'}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
