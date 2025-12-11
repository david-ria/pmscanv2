/**
 * Enhanced error boundary component for production-ready error handling
 */
import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import * as logger from '@/utils/logger';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showReload?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to monitoring service
    logger.error('React Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Check if it's a chunk/module loading error
      const errorMessage = this.state.error?.message || '';
      const isChunkLoadError = 
        errorMessage.includes('dynamically imported module') || 
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('Loading chunk') ||
        errorMessage.includes('ChunkLoadError');

      // Default error UI with production-safe styling
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: '#0a0a0a'
        }}>
          <div style={{ 
            maxWidth: '28rem', 
            width: '100%', 
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <AlertTriangle style={{ height: '4rem', width: '4rem', color: isChunkLoadError ? '#f59e0b' : '#ef4444' }} />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h1 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                color: '#fafafa',
                marginBottom: '0.5rem'
              }}>
                {isChunkLoadError ? 'Page failed to load' : 'Something went wrong'}
              </h1>
              <p style={{ color: '#a1a1aa' }}>
                {isChunkLoadError 
                  ? 'The app was updated. Please refresh the page to get the latest version.'
                  : 'We\'re sorry, but something unexpected happened. Please try refreshing the page.'
                }
              </p>
            </div>

            {!isChunkLoadError && this.state.error && (
              <details style={{ 
                textAlign: 'left', 
                backgroundColor: '#27272a', 
                padding: '1rem', 
                borderRadius: '0.5rem',
                marginBottom: '1.5rem'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: '500', marginBottom: '0.5rem', color: '#fafafa' }}>
                  Error Details
                </summary>
                <pre style={{ 
                  fontSize: '0.75rem', 
                  overflow: 'auto', 
                  whiteSpace: 'pre-wrap',
                  color: '#a1a1aa'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              {!isChunkLoadError && (
                <button 
                  onClick={this.handleReset}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #3f3f46',
                    backgroundColor: 'transparent',
                    color: '#fafafa',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Try Again
                </button>
              )}
              
              {this.props.showReload !== false && (
                <button 
                  onClick={this.handleReload}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <RefreshCw style={{ height: '1rem', width: '1rem' }} />
                  Refresh Page
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
