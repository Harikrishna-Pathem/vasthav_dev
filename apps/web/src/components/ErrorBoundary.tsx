import { Component, ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
}
  render() { return this.state.failed ? <main role="alert">Something went wrong.</main> : this.props.children; }
}
