import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* connect structured reporting in a later phase */ }
  render() { return this.state.failed ? <main role="alert">Something went wrong.</main> : this.props.children; }
}
