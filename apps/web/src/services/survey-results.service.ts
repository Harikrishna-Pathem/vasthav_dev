import { apiClient } from '../api/client';
import type { SurveyResults } from '../types/survey-results';

export async function getSurveyResults(
  surveyId: string,
): Promise<SurveyResults> {
  const response = await apiClient.get<SurveyResults>(
    `/surveys/${surveyId}/results`,
  );

  return response.data;
}
