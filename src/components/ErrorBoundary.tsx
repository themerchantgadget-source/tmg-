import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Workspace render boundary caught:', error);
  }

  private handleResetSnapshot = () => {
    try {
      localStorage.removeItem('tmg-workspace-v2');
      localStorage.removeItem('tmg-workspace-v1');
    } catch {
      // Ignore storage failures
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="min-h-[100dvh] bg-[var(--page)] text-[var(--text)] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-[var(--card)] border border-[var(--border)] p-6 shadow-sm space-y-4">
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-[var(--text)]">
              Workspace recovered from an unexpected error
            </h1>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              {this.state.error.message ||
                'A runtime script error interrupted this view. You can retry rendering or restore default workspace data.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 rounded-xl bg-[var(--dark-btn)] text-[var(--page)] text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleResetSnapshot}
              className="px-4 py-2 rounded-xl border border-[var(--border)] bg-transparent text-[var(--text)] text-sm font-medium hover:bg-[var(--card-alt)] transition-colors cursor-pointer"
            >
              Reset workspace snapshot
            </button>
          </div>
        </div>
      </div>
    );
  }
}
