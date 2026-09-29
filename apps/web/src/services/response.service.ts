import { apiClient } from '../api/client';
import type {
  ListResponsesParams,
  SurveyResponse,
  SurveyResponseListResponse,
} from '../types/response';

export async function listResponsesBySurvey(
  surveyId: string,
  params: ListResponsesParams = {},
): Promise<SurveyResponseListResponse> {
  const response = await apiClient.get<SurveyResponseListResponse>(
    `/responses/survey/${surveyId}`,
    {
      params,
    },
  );

  return response.data;
}

export async function getResponse(
  responseId: string,
): Promise<SurveyResponse> {
  const response = await apiClient.get<SurveyResponse>(
    `/responses/${responseId}`,
  );

  return response.data;
}
