import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleDashboardRedirect } from './components/RoleDashboardRedirect';
import { AppShell } from './components/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SurveysPage } from './pages/surveys/SurveysPage';
import { CreateSurveyPage } from './pages/surveys/CreateSurveyPage';
import { SurveyDetailsPage } from './pages/surveys/SurveyDetailsPage';
import { SurveyQuestionsPage } from './pages/surveys/SurveyQuestionsPage';
import { CreateQuestionPage } from './pages/surveys/CreateQuestionPage';
import { EditQuestionPage } from './pages/surveys/EditQuestionPage';
import { SurveyResponsesPage } from './pages/responses/SurveyResponsesPage';
import { ResponseDetailsPage } from './pages/responses/ResponseDetailsPage';
import { SurveyResultsPage } from './pages/results/SurveyResultsPage';
import { RegistrationPage } from './pages/auth/RegistrationPage';
import { RegistrationOtpPage } from './pages/auth/RegistrationOtpPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { RoleSelectionPage } from './pages/RoleSelectionPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/select-role" element={<RoleSelectionPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/register/verify-otp" element={<RegistrationOtpPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<RoleDashboardRedirect />} />
              <Route element={<ProtectedRoute allowedRoles={['USER']} />}>
                <Route path="/dashboard/user" element={<DashboardPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['SURVEYER']} />}>
                <Route path="/dashboard/head" element={<DashboardPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/dashboard/admin" element={<DashboardPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SURVEYER']} />}>
                <Route path="/surveys" element={<SurveysPage />} />
                <Route path="/surveys/new" element={<CreateSurveyPage />} />
                <Route path="/surveys/:id" element={<SurveyDetailsPage />} />

                <Route path="/surveys/:id/questions" element={<SurveyQuestionsPage />} />
                <Route path="/surveys/:id/questions/new" element={<CreateQuestionPage />} />
                <Route path="/surveys/:id/questions/:questionId" element={<EditQuestionPage />} />
                <Route path="/surveys/:id/responses" element={<SurveyResponsesPage />} />
                <Route path="/surveys/:id/results" element={<SurveyResultsPage />} />

                <Route path="/responses/:id" element={<ResponseDetailsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
