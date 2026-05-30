import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import StudentLayout from './components/StudentLayout';
import AdminLayout from './components/AdminLayout';
import PublicLayout from './components/PublicLayout';

// Public website pages
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/public/AboutPage';
import ExecutivesPage from './pages/public/ExecutivesPage';
import EventsPage from './pages/public/EventsPage';
import ContactPage from './pages/public/ContactPage';
import GalleryPage from './pages/public/GalleryPage';
import BlogPage from './pages/public/BlogPage';
import LoginPage from './pages/auth/LoginPage';
import ValidatePage from './pages/auth/ValidatePage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateUserPage from './pages/admin/CreateUserPage';
import UserListPage from './pages/admin/UserListPage';
import GradebookListPage from './pages/admin/GradebookListPage';
import CreateGradebookPage from './pages/admin/CreateGradebookPage';
import GradebookDetailPage from './pages/admin/GradebookDetailPage';
import GradeEntryPage from './pages/admin/GradeEntryPage';
import ElectionListPage from './pages/admin/ElectionListPage';
import CreateElectionPage from './pages/admin/CreateElectionPage';
import ElectionDetailPage from './pages/admin/ElectionDetailPage';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import ResultsHomePage from './pages/student/ResultsHomePage';
import ResultDetailPage from './pages/student/ResultDetailPage';
import TranscriptPage from './pages/student/TranscriptPage';
import SchoolFeesPage from './pages/student/SchoolFeesPage';
import PaymentsPage from './pages/student/PaymentsPage';
import RegistrationPage from './pages/student/RegistrationPage';
import ElectionsPage from './pages/student/ElectionsPage';
import NotificationsPage from './pages/student/NotificationsPage';
import ProfilePage from './pages/student/ProfilePage';
import PaymentVerifyPage from './pages/student/PaymentVerifyPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public website ──────────────────────────────────────────── */}
        <Route element={<PublicLayout />}>
          <Route path="/about"      element={<AboutPage />} />
          <Route path="/executives" element={<ExecutivesPage />} />
          <Route path="/events"     element={<EventsPage />} />
          <Route path="/gallery"    element={<GalleryPage />} />
          <Route path="/blog"       element={<BlogPage />} />
          <Route path="/contact"    element={<ContactPage />} />
        </Route>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/validate" element={<ValidatePage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

        {/* ── Admin ────────────────────────────────────────────────────── */}
        <Route element={<ProtectedRoute roles={['admin', 'super_admin']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard"                                       element={<AdminDashboard />} />
            <Route path="/admin/users"                                           element={<UserListPage />} />
            <Route path="/admin/users/new"                                       element={<CreateUserPage />} />
            <Route path="/admin/gradebooks"                                      element={<GradebookListPage />} />
            <Route path="/admin/gradebooks/new"                                  element={<CreateGradebookPage />} />
            <Route path="/admin/gradebooks/:id"                                  element={<GradebookDetailPage />} />
            <Route path="/admin/gradebooks/:id/courses/:courseId/grades"         element={<GradeEntryPage />} />
            <Route path="/admin/elections"     element={<ElectionListPage />} />
            <Route path="/admin/elections/new" element={<CreateElectionPage />} />
            <Route path="/admin/elections/:id" element={<ElectionDetailPage />} />
          </Route>
        </Route>

        {/* ── Student ──────────────────────────────────────────────────── */}
        <Route element={<ProtectedRoute roles={['student']} />}>
          {/* Shell routes — sidebar + topbar */}
          <Route element={<StudentLayout />}>
            <Route path="/student/dashboard"             element={<StudentDashboard />} />
            <Route path="/student/results"               element={<ResultsHomePage />} />
            <Route path="/student/results/:gradebookId"  element={<ResultDetailPage />} />
            <Route path="/student/transcript"            element={<TranscriptPage />} />
            <Route path="/student/school-fees"           element={<SchoolFeesPage />} />
            <Route path="/student/payments"              element={<PaymentsPage />} />
            <Route path="/student/registration"          element={<RegistrationPage />} />
            <Route path="/student/elections"             element={<ElectionsPage />} />
            <Route path="/student/notifications"         element={<NotificationsPage />} />
            <Route path="/student/profile"               element={<ProfilePage />} />
          </Route>
          {/* Full-screen — no shell */}
          <Route path="/student/results/verify"          element={<PaymentVerifyPage />} />
          <Route path="/student/school-fees/verify"      element={<PaymentVerifyPage />} />
        </Route>

        {/* ── Fallback ─────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
