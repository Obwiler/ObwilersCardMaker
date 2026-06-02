import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * 错误边界 —— 捕获子组件渲染错误并展示回退 UI。
 * 同时集成"错题集"概念：每次捕获的错误会被记录到 internal 列表，
 * 可通过 onCollect 回调传递给父组件进行持久化。
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private static collectedErrors: { time: number; error: Error; componentStack: string }[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    ErrorBoundary.collectedErrors.push({
      time: Date.now(),
      error,
      componentStack: errorInfo.componentStack ?? '',
    });
  }

  static getCollectedErrors() {
    return ErrorBoundary.collectedErrors;
  }

  static clearCollectedErrors() {
    ErrorBoundary.collectedErrors = [];
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary__card">
            <h2 className="error-boundary__title">组件渲染出错</h2>
            <p className="error-boundary__message">
              {this.state.error?.message ?? '未知错误'}
            </p>
            {this.state.error?.name && (
              <p className="error-boundary__type">错误类型：{this.state.error.name}</p>
            )}
            {this.state.errorInfo?.componentStack && (
              <details className="error-boundary__details">
                <summary>错误详情</summary>
                <pre className="error-boundary__stack">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div className="error-boundary__actions">
              <button className="error-boundary__retry" onClick={this.handleRetry}>
                重试
              </button>
            </div>
            <p className="error-boundary__hint">
              此错误已被记录至错题集（共 {ErrorBoundary.collectedErrors.length} 条）。
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
