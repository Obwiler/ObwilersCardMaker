/**
 * ErrorBoundary — React 错误边界 (Class Component)
 * 捕获子组件渲染错误，显示友好降级 UI
 */

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  padding: "var(--space-2xl)",
  gap: "var(--space-md)",
  color: "var(--color-text-secondary)",
};

const errorBoxStyle: React.CSSProperties = {
  padding: "var(--space-md) var(--space-lg)",
  background: "var(--color-bg-elevated)",
  border: "1px solid var(--color-error)",
  borderRadius: "var(--radius-md)",
  maxWidth: "600px",
  width: "100%",
};

const errorTitleStyle: React.CSSProperties = {
  fontSize: "var(--font-lg)",
  fontWeight: 700,
  color: "var(--color-error)",
  marginBottom: "var(--space-sm)",
};

const errorMessageStyle: React.CSSProperties = {
  fontSize: "var(--font-sm)",
  fontFamily: "var(--font-mono)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  maxHeight: "200px",
  overflow: "auto",
  marginBottom: "var(--space-md)",
};

const retryBtnStyle: React.CSSProperties = {
  padding: "var(--space-sm) var(--space-lg)",
  background: "var(--color-primary)",
  color: "var(--color-text-inverse)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  fontSize: "var(--font-sm)",
  fontWeight: 600,
};

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={containerStyle}>
          <div style={errorBoxStyle}>
            <div style={errorTitleStyle}>页面渲染出错</div>
            <div style={errorMessageStyle}>
              {this.state.error?.message || "未知错误"}
            </div>
            <button style={retryBtnStyle} onClick={this.handleRetry}>
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
