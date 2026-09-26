import { useCallback, useState } from "react";
import SplashScreen from "./components/common/SplashScreen";
import AppProviders from "./app/providers/AppProviders";
import AppRouter from "./app/router/AppRouter";
import { useAuth } from "./features/auth/context/AuthContext";
import { useCart } from "./context/useCart";
import "./styles/Brand.css";

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const { status } = useAuth();
  const { loading: cartLoading } = useCart();
  const completeSplash = useCallback(() => setShowSplash(false), []);
  const loading = status === "loading" || (status === "authenticated" && cartLoading);

  return (
    <>
      {showSplash && <SplashScreen ready={!loading} onComplete={completeSplash}
        caption={status === "loading" ? "Vérification de votre session…" : "Chargement de votre commande en préparation…"} />}
      <div inert={showSplash}><AppRouter /></div>
    </>
  );
}

function App() {
  return <AppProviders><AppContent /></AppProviders>;
}

export default App;
