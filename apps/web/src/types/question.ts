export type QuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'BOOLEAN'
  | 'IMAGE'
  | 'VIDEO'
  | 'FILE';

export type QuestionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type QuestionOptionStatus = 'ACTIVE' | 'INACTIVE';

export interface QuestionOption {
  id: string;
  questionId: string;
  code: string;
  value: string;
  displayOrder: number;
  status: QuestionOptionStatus;
}

export interface Question {
  id: string;
  code: string;
  text: string;
  description: string | null;
  questionType: QuestionType;
  required: boolean;
  status: QuestionStatus;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  options?: QuestionOption[];
}

export interface SurveyQuestion {
  id: string;
  surveyId: string;
  questionId: string;
  displayOrder: number;
  isRequired: boolean;
  question: Question;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionOptionRequest {
  code: string;
  value: string;
  displayOrder?: number;
  status?: QuestionOptionStatus;
}

export interface CreateQuestionRequest {
  code?: string;
  text: string;
  description?: string;
  questionType: QuestionType;
  required?: boolean;
  status?: QuestionStatus;
  options?: CreateQuestionOptionRequest[];
}

export interface UpdateQuestionRequest {
  code?: string;
  text?: string;
  description?: string | null;
  questionType?: QuestionType;
  required?: boolean;
  options?: CreateQuestionOptionRequest[];
}

export interface UpdateQuestionStatusRequest {
  status: QuestionStatus;
}

export interface UpdateQuestionOptionRequest {
  code?: string;
  value?: string;
  displayOrder?: number;
  status?: QuestionOptionStatus;
}
