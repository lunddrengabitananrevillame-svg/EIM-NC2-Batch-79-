import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Contributions from "./pages/Contributions";
import ContributionDetails from "./pages/ContributionDetails";
import MemberContributions from "./pages/MemberContributions";
import Expenses from "./pages/Expenses";
import AuditLogs from "./pages/AuditLogs";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Settlements from "./pages/Settlements";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="contributions" element={<Contributions />} />
        <Route path="contributions/:id" element={<ContributionDetails />} />
        <Route path="member-contributions" element={<MemberContributions />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="logs" element={<AuditLogs />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settlements" element={<Settlements />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

