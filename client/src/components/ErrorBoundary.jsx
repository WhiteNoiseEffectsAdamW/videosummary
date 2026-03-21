import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-box">
          Something went wrong displaying this summary. Try refreshing the page.
        </div>
      );
    }
    return this.props.children;
  }
}
