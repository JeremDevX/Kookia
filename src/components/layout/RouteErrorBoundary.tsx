import { Component, type ReactNode } from "react";
import Button from "../common/Button";

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
}

export default class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <section className="container flex flex-col gap-md" role="alert" aria-labelledby="route-error-title">
        <h1 id="route-error-title">Cette page n’a pas pu être chargée.</h1>
        <p>Vérifiez votre connexion, puis réessayez.</p>
        <Button type="button" onClick={() => window.location.reload()}>Recharger KookiA</Button>
      </section>;
    }

    return this.props.children;
  }
}
