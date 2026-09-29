export type SurveyResultOption = {
  code: string;
  label: string;
  count: number;
  percentage: number;
};

interface SurveyResultQuestionBase {
  id: string;
  code: string;
  text: string;
  displayOrder: number;
}

export type SurveyResultQuestion =
  | (SurveyResultQuestionBase & {
      type: 'TEXT';
      results: { totalAnswered: number; values: string[] };
    })
  | (SurveyResultQuestionBase & {
      type: 'NUMBER';
      results: {
        count: number;
        minimum: number | null;
        maximum: number | null;
        average: number | null;
      };
    })
  | (SurveyResultQuestionBase & {
      type: 'BOOLEAN';
      results: { total: number; trueCount: number; falseCount: number };
    })
  | (SurveyResultQuestionBase & {
      type: 'SINGLE_CHOICE';
      results: { totalAnswers: number; options: SurveyResultOption[] };
    })
  | (SurveyResultQuestionBase & {
      type: 'MULTIPLE_CHOICE';
      results: { totalResponses: number; options: SurveyResultOption[] };
    })
  | (SurveyResultQuestionBase & {
      type: 'DATE';
      results: { totalAnswered: number };
    })
  | (SurveyResultQuestionBase & {
      type: 'IMAGE' | 'VIDEO' | 'FILE';
      results: { totalAnswered: number };
    });

export interface SurveyResults {
  survey: {
    id: string;
    code: string;
    name: string;
  };
  totalResponses: number;
  questions: SurveyResultQuestion[];
}
