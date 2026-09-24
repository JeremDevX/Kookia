import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Layout from "../../components/layout/Layout";
import { RequireAuth } from "../../features/auth/components/RequireAuth";
import { PublicOnly } from "../../features/auth/components/PublicOnly";
import Login from "../../features/auth/pages/Login";
import Register from "../../features/auth/pages/Register";

const Dashboard = lazy(() => import("../../pages/Dashboard"));
const Stocks = lazy(() => import("../../pages/Stocks"));
const Predictions = lazy(() => import("../../pages/Predictions"));
const Recipes = lazy(() => import("../../pages/Recipes"));
const Orders = lazy(() => import("../../pages/Orders"));
const Settings = lazy(() => import("../../pages/Settings"));
const Analytics = lazy(() => import("../../pages/Analytics"));
const Sales = lazy(() => import("../../pages/Sales"));
const More = lazy(() => import("../../pages/More"));
const Timeline = lazy(() => import("../../pages/Timeline"));

const AppRouter = () => (
  <Router>
    <Suspense fallback={<div className="container">Chargement...</div>}>
      <Routes>
        <Route element={<PublicOnly />}><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} /></Route>
        <Route element={<RequireAuth />}><Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="stocks" element={<Stocks />} />
          <Route path="predictions" element={<Predictions />} />
          <Route path="recipes" element={<Recipes />} />
          <Route path="orders" element={<Orders />} />
          <Route path="settings" element={<Settings />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="sales" element={<Sales />} />
          <Route path="more" element={<More />} />
          <Route path="history" element={<Timeline />} />
        </Route></Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </Router>
);

export default AppRouter;
