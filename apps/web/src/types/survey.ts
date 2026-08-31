export type SurveyStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type UserLanguage = 'en' | 'te' | 'hi';

export interface SurveyTranslation {
  id: string;
  surveyId: string;
  language: UserLanguage;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Survey {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: SurveyStatus;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  translations?: SurveyTranslation[];
  language?: UserLanguage;
}

export interface SurveyListResponse {
  page: number;
  limit: number;
  total: number;
  data: Survey[];
}

export interface CreateSurveyRequest {
  name: string;
  code?: string;
  description?: string;
  status?: SurveyStatus;
}

export interface UpdateSurveyRequest {
  name?: string;
  code?: string;
  description?: string | null;
}

export interface UpdateSurveyStatusRequest {
  status: SurveyStatus;
}
