import { Component } from "react"
import type { ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">
              Une erreur s'est produite dans ce composant
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {this.state.error?.message}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-secondary text-xs gap-1.5"
          >
            <RefreshCw size={12} /> Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}