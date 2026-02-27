import { Suspense, lazy, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import SplashScreen from "./components/common/SplashScreen";

import { ToastProvider } from "./context/ToastContext";
import { CartProvider } from "./context/CartContext";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Stocks = lazy(() => import("./pages/Stocks"));
const Predictions = lazy(() => import("./pages/Predictions"));
const Recipes = lazy(() => import("./pages/Recipes"));
const Settings = lazy(() => import("./pages/Settings"));
const Analytics = lazy(() => import("./pages/Analytics"));

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ToastProvider>
      <CartProvider>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        <Router>
          <Suspense fallback={<div className="container">Chargement...</div>}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="stocks" element={<Stocks />} />
                <Route path="predictions" element={<Predictions />} />
                <Route path="recipes" element={<Recipes />} />
                <Route path="settings" element={<Settings />} />
                <Route path="analytics" element={<Analytics />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </CartProvider>
    </ToastProvider>
  );
}

export default App;
