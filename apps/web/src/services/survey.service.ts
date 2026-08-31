import { apiClient } from '../api/client';
import type {
  CreateSurveyRequest,
  Survey,
  SurveyListResponse,
  UpdateSurveyRequest,
  UpdateSurveyStatusRequest,
  UserLanguage,
} from '../types/survey';

export interface ListSurveysParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  language?: UserLanguage;
}

export async function listSurveys(
  params: ListSurveysParams = {},
): Promise<SurveyListResponse> {
  const response = await apiClient.get<SurveyListResponse>('/surveys', {
    params,
  });

  return response.data;
}

export async function getSurvey(
  id: string,
  language?: UserLanguage,
): Promise<Survey> {
  const response = await apiClient.get<Survey>(`/surveys/${id}`, {
    params: language ? { language } : undefined,
  });

  return response.data;
}

export async function createSurvey(
  data: CreateSurveyRequest,
): Promise<Survey> {
  const response = await apiClient.post<Survey>('/surveys', data);
  return response.data;
}

export async function updateSurvey(
  id: string,
  data: UpdateSurveyRequest,
): Promise<Survey> {
  const response = await apiClient.patch<Survey>(`/surveys/${id}`, data);
  return response.data;
}

export async function updateSurveyStatus(
  id: string,
  data: UpdateSurveyStatusRequest,
): Promise<Survey> {
  const response = await apiClient.patch<Survey>(
    `/surveys/${id}/status`,
    data,
  );

  return response.data;
}

export async function archiveSurvey(id: string): Promise<Survey> {
  const response = await apiClient.patch<Survey>(`/surveys/${id}/archive`);
  return response.data;
}
