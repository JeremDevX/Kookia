import { useState } from "react";
import SplashScreen from "./components/common/SplashScreen";
import AppProviders from "./app/providers/AppProviders";
import AppRouter from "./app/router/AppRouter";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AppProviders>
      <>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        <AppRouter />
      </>
    </AppProviders>
  );
}

export default App;
