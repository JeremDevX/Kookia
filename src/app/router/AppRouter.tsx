import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { WorkspaceLayout, WorkspaceHome, WorkspaceStocks, WorkspaceOrders, OwnerOnly } from "../../features/members/WorkspaceLayout";
import InvitationAccept from "../../features/invitations/InvitationAccept";
import { RequireAuth } from "../../features/auth/components/RequireAuth";
import { PublicOnly } from "../../features/auth/components/PublicOnly";
import Login from "../../features/auth/pages/Login";
import Register from "../../features/auth/pages/Register";
import { SetupGuard } from "../../features/setup/SetupGuard";
import SetupPage from "../../features/setup/SetupPage";

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
const Services = lazy(() => import("../../pages/Services"));

function LegacyTimelineReplayRedirect() {
  const location = useLocation();
  return <Navigate to={`/history${location.search}`} replace />;
}

const AppRouter = () => (
  <Router>
    <Suspense fallback={<div className="container">Chargement...</div>}>
      <Routes>
        <Route path="/invite" element={<InvitationAccept onAccepted={() => window.location.replace("/")} />} />
        <Route element={<PublicOnly />}><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} /></Route>
        <Route element={<RequireAuth />}><Route element={<SetupGuard key="setup" setupPage />}><Route path="/setup" element={<SetupPage />} /></Route><Route element={<SetupGuard key="workspace" />}><Route path="/" element={<WorkspaceLayout />}>
          <Route index element={<WorkspaceHome owner={<Dashboard />} />} />
          <Route path="stocks" element={<WorkspaceStocks owner={<Stocks />} />} />
          <Route path="predictions" element={<OwnerOnly><Predictions /></OwnerOnly>} />
          <Route path="recipes" element={<OwnerOnly><Recipes /></OwnerOnly>} />
          <Route path="orders" element={<WorkspaceOrders owner={<Orders />} />} />
          <Route path="settings" element={<OwnerOnly><Settings /></OwnerOnly>} />
          <Route path="analytics" element={<OwnerOnly><Analytics /></OwnerOnly>} />
          <Route path="sales" element={<OwnerOnly><Sales /></OwnerOnly>} />
          <Route path="services" element={<OwnerOnly><Services /></OwnerOnly>} />
          <Route path="more" element={<OwnerOnly><More /></OwnerOnly>} />
          <Route path="history" element={<OwnerOnly><Timeline /></OwnerOnly>} />
          <Route path="history/replay/:id" element={<OwnerOnly><LegacyTimelineReplayRedirect /></OwnerOnly>} />
        </Route></Route></Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </Router>
);

export default AppRouter;
