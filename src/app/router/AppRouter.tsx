import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Layout from "../../components/layout/Layout";

const Dashboard = lazy(() => import("../../pages/Dashboard"));
const Stocks = lazy(() => import("../../pages/Stocks"));
const Predictions = lazy(() => import("../../pages/Predictions"));
const Recipes = lazy(() => import("../../pages/Recipes"));
const Settings = lazy(() => import("../../pages/Settings"));
const Analytics = lazy(() => import("../../pages/Analytics"));

const AppRouter = () => (
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
);

export default AppRouter;
