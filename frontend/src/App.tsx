import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import ValidatePage from './pages/auth/ValidatePage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateUserPage from './pages/admin/CreateUserPage';
import UserListPage from './pages/admin/UserListPage';
import GradebookListPage from './pages/admin/GradebookListPage';
import CreateGradebookPage from './pages/admin/CreateGradebookPage';
import GradebookDetailPage from './pages/admin/GradebookDetailPage';
import GradeEntryPage from './pages/admin/GradeEntryPage';
import ResultsHomePage from './pages/student/ResultsHomePage';
import ResultDetailPage from './pages/student/ResultDetailPage';
import PaymentVerifyPage from './pages/student/PaymentVerifyPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public ──────────────────────────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/validate" element={<ValidatePage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

        {/* ── Admin (requires admin or super_admin role) ───────────────── */}
        <Route element={<ProtectedRoute roles={['admin', 'super_admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserListPage />} />
          <Route path="/admin/users/new" element={<CreateUserPage />} />
          <Route path="/admin/gradebooks" element={<GradebookListPage />} />
          <Route path="/admin/gradebooks/new" element={<CreateGradebookPage />} />
          <Route path="/admin/gradebooks/:id" element={<GradebookDetailPage />} />
          <Route path="/admin/gradebooks/:id/courses/:courseId/grades" element={<GradeEntryPage />} />
        </Route>

        {/* ── Student (requires student role) ─────────────────────────── */}
        <Route element={<ProtectedRoute roles={['student']} />}>
          <Route path="/student/dashboard" element={<ResultsHomePage />} />
          <Route path="/student/results" element={<ResultsHomePage />} />
          <Route path="/student/results/verify" element={<PaymentVerifyPage />} />
          <Route path="/student/results/:gradebookId" element={<ResultDetailPage />} />
        </Route>

        {/* ── Fallback ─────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
