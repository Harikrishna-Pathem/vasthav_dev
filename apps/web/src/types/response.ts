export type SurveyResponseStatus = 'SUBMITTED';

export interface SurveyResponseListItem {
  id: string;
  surveyId: string;
  respondentId: string | null;
  status: SurveyResponseStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyResponseListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SurveyResponseListResponse {
  items: SurveyResponseListItem[];
  meta: SurveyResponseListMeta;
}

export interface SurveyResponseQuestion {
  id: string;
  code: string;
  text: string;
  questionType:
    | 'TEXT'
    | 'NUMBER'
    | 'DATE'
    | 'BOOLEAN'
    | 'SINGLE_CHOICE'
    | 'MULTIPLE_CHOICE'
    | 'IMAGE'
    | 'VIDEO'
    | 'FILE';
  required: boolean;
}

export interface SurveyResponseAnswer {
  id: string;
  questionId: string;
  answer: unknown;
  createdAt: string;
  question: SurveyResponseQuestion;
}

export interface SurveyResponseSurvey {
  id: string;
  code: string;
  name: string;
  status: string;
  createdBy: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId: string | null;
  status: SurveyResponseStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  survey: SurveyResponseSurvey;
  answers: SurveyResponseAnswer[];
}

export interface ListResponsesParams {
  page?: number;
  limit?: number;
  status?: SurveyResponseStatus;
  respondentId?: string;
}
