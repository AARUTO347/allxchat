import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ALLXCHAT render error', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-dvh flex-col items-center justify-center bg-[#f0f2f5] px-6 text-center dark:bg-[#0b141a]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle size={30} />
          </div>
          <h1 className="text-xl font-semibold text-[#111b21] dark:text-[#e9edef]">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#667781] dark:text-[#8696a0]">
            {this.state.message || 'The page could not be displayed.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <RefreshCw size={16} />
            Reload ALLXCHAT
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
