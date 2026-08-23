import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <main className="crash-state"><h1>Skyline needs a refresh.</h1><p>Something unexpected happened while rendering the forecast.</p><button onClick={() => window.location.reload()}>Reload dashboard</button></main>;
    }
    return this.props.children;
  }
}
