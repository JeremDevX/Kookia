import { useCallback, useState } from "react";
import SplashScreen from "./components/common/SplashScreen";
import AppProviders from "./app/providers/AppProviders";
import AppRouter from "./app/router/AppRouter";
import { useAuth } from "./features/auth/context/AuthContext";
import "./styles/Brand.css";

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const { status } = useAuth();
  const completeSplash = useCallback(() => setShowSplash(false), []);
  const loading = status === "loading";

  return (
    <>
      {showSplash && <SplashScreen ready={!loading} onComplete={completeSplash}
        caption="Vérification de votre session…" />}
      <div inert={showSplash}><AppRouter /></div>
    </>
  );
}

function App() {
  return <AppProviders><AppContent /></AppProviders>;
}

export default App;
