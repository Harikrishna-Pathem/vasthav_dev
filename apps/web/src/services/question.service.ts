import { apiClient } from '../api/client';
import type {
  CreateQuestionOptionRequest,
  CreateQuestionRequest,
  Question,
  SurveyQuestion,
  SurveyQuestionsResponse,
  UpdateQuestionOptionRequest,
  UpdateQuestionRequest,
  UpdateQuestionStatusRequest,
} from '../types/question';

export async function listSurveyQuestions(
  surveyId: string,
): Promise<SurveyQuestionsResponse> {
  const response = await apiClient.get<SurveyQuestion[]>(
    `/surveys/${surveyId}/questions`,
  );

  return {
    data: response.data,
    total: response.data.length,
  };
}

export async function createQuestion(
  data: CreateQuestionRequest,
): Promise<Question> {
  const response = await apiClient.post<Question>(
    '/questions',
    data,
  );

  return response.data;
}

export async function getQuestion(
  id: string,
): Promise<Question> {
  const response = await apiClient.get<Question>(
    `/questions/${id}`,
  );

  return response.data;
}

export async function updateQuestion(
  id: string,
  data: UpdateQuestionRequest,
): Promise<Question> {
  const response = await apiClient.patch<Question>(
    `/questions/${id}`,
    data,
  );

  return response.data;
}

export async function updateQuestionStatus(
  id: string,
  data: UpdateQuestionStatusRequest,
): Promise<Question> {
  const response = await apiClient.patch<Question>(
    `/questions/${id}/status`,
    data,
  );

  return response.data;
}

export async function addQuestionToSurvey(
  surveyId: string,
  questionId: string,
): Promise<unknown> {
  const response = await apiClient.post(
    `/surveys/${surveyId}/questions/${questionId}`,
  );

  return response.data;
}

export async function updateSurveyQuestionOrder(
  surveyId: string,
  surveyQuestionId: string,
  displayOrder: number,
): Promise<unknown> {
  const response = await apiClient.patch(
    `/surveys/${surveyId}/questions/${surveyQuestionId}/order`,
    { displayOrder },
  );

  return response.data;
}

export async function removeQuestionFromSurvey(
  surveyId: string,
  surveyQuestionId: string,
): Promise<void> {
  await apiClient.delete(
    `/surveys/${surveyId}/questions/${surveyQuestionId}`,
  );
}

export async function listQuestionOptions(
  questionId: string,
): Promise<Question['options']> {
  const response = await apiClient.get<Question['options']>(
    `/questions/${questionId}/options`,
  );

  return response.data;
}

export async function createQuestionOption(
  questionId: string,
  data: CreateQuestionOptionRequest,
) {
  const response = await apiClient.post(
    `/questions/${questionId}/options`,
    data,
  );

  return response.data;
}

export async function updateQuestionOption(
  questionId: string,
  optionId: string,
  data: UpdateQuestionOptionRequest,
) {
  const response = await apiClient.patch(
    `/questions/${questionId}/options/${optionId}`,
    data,
  );

  return response.data;
}

export async function updateQuestionOptionStatus(
  questionId: string,
  optionId: string,
  status: 'ACTIVE' | 'INACTIVE',
) {
  const response = await apiClient.patch(
    `/questions/${questionId}/options/${optionId}/status`,
    { status },
  );

  return response.data;
}
