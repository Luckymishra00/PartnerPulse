import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import Shell from './components/Shell.jsx';
import { Spinner } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Suppliers from './pages/Suppliers.jsx';
import SupplierDetail from './pages/SupplierDetail.jsx';
import Contracts from './pages/Contracts.jsx';
import Deliveries from './pages/Deliveries.jsx';
import Evaluations from './pages/Evaluations.jsx';
import SlaWatch from './pages/SlaWatch.jsx';
import Reports from './pages/Reports.jsx';

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner />;
  if (!user) return <Login />;
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Overview />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="suppliers/:id" element={<SupplierDetail />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="evaluations" element={<Evaluations />} />
        <Route path="sla" element={<SlaWatch />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
