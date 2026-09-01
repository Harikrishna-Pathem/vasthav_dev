import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SurveysPage } from './pages/surveys/SurveysPage';
import { CreateSurveyPage } from './pages/surveys/CreateSurveyPage';
import { SurveyDetailsPage } from './pages/surveys/SurveyDetailsPage';
import { SurveyQuestionsPage } from './pages/surveys/SurveyQuestionsPage';
import { CreateQuestionPage } from './pages/surveys/CreateQuestionPage';
import { EditQuestionPage } from './pages/surveys/EditQuestionPage';
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/surveys" element={<SurveysPage />} />
            <Route path="/surveys/new" element={<CreateSurveyPage />} />
            <Route path="/surveys/:id" element={<SurveyDetailsPage />} />

            <Route path="/surveys/:id/questions" element={<SurveyQuestionsPage />} />
            <Route path="/surveys/:id/questions/new" element={<CreateQuestionPage />} />
            <Route path="/surveys/:id/questions/:questionId" element={<EditQuestionPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}




