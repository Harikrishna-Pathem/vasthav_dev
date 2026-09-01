import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  listSurveyQuestions,
  removeQuestionFromSurvey,
  updateSurveyQuestionOrder,
} from '../../services/question.service';
import { getSurvey } from '../../services/survey.service';

import type { Survey } from '../../types/survey';
import type {
  QuestionType,
  SurveyQuestion,
} from '../../types/question';

const questionTypeLabels: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'Single choice',
  MULTIPLE_CHOICE: 'Multiple choice',
  TEXT: 'Text',
  NUMBER: 'Number',
  DATE: 'Date',
  BOOLEAN: 'Yes / No',
  IMAGE: 'Image',
  VIDEO: 'Video',
  FILE: 'File',
};

function QuestionTypeBadge({
  type,
}: {
  type: QuestionType;
}) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
      {questionTypeLabels[type]}
    </span>
  );
}

function QuestionCard({
  item,
  index,
  total,
  disabled,
  onMove,
  onRemove,
  onEdit,
}: {
  item: SurveyQuestion;
  index: number;
  total: number;
  disabled: boolean;
  onMove: (
    item: SurveyQuestion,
    direction: 'up' | 'down',
  ) => void;
  onRemove: (item: SurveyQuestion) => void;
  onEdit: (questionId: string) => void;
}) {
  const question = item.question;

  return (
    <div className="card p-5">
      <div className="flex items-start gap-4">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-vasthav-50 text-sm font-extrabold text-vasthav-700">
            {index + 1}
          </span>

          <div className="flex flex-col gap-1">
            <button
              type="button"
              disabled={disabled || index === 0}
              onClick={() => onMove(item, 'up')}
              className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Move question up"
              title="Move up"
            >
              ?
            </button>

            <button
              type="button"
              disabled={disabled || index === total - 1}
              onClick={() => onMove(item, 'down')}
              className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Move question down"
              title="Move down"
            >
              ?
            </button>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <QuestionTypeBadge type={question.questionType} />

            {question.required && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                Required
              </span>
            )}

            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
              {question.status}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onEdit(question.id)}
            className="mt-3 block text-left"
          >
            <h3 className="text-base font-bold text-slate-900 transition hover:text-vasthav-700">
              {question.text}
            </h3>
          </button>

          {question.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {question.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
            <span>{question.code}</span>
            <span>Version {question.version}</span>

            {question.options &&
              question.options.length > 0 && (
                <span>
                  {question.options.length} option
                  {question.options.length === 1
                    ? ''
                    : 's'}
                </span>
              )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onEdit(question.id)}
            className="btn-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            Edit
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemove(item)}
            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export function SurveyQuestionsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] =
    useState<SurveyQuestion[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    if (!id) {
      setError('Survey ID is missing.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [surveyResponse, questionsResponse] =
        await Promise.all([
          getSurvey(id),
          listSurveyQuestions(id),
        ]);

      setSurvey(surveyResponse);

      const sorted = [...questionsResponse].sort(
        (a, b) =>
          a.displayOrder - b.displayOrder,
      );

      setQuestions(sorted);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load survey questions.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleMove(
    item: SurveyQuestion,
    direction: 'up' | 'down',
  ) {
    if (!id || isWorking) return;

    const currentIndex = questions.findIndex(
      (question) => question.id === item.id,
    );

    const targetIndex =
      direction === 'up'
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= questions.length
    ) {
      return;
    }

    const target = questions[targetIndex];

    setIsWorking(true);
    setError('');
    setSuccess('');

    try {
      await updateSurveyQuestionOrder(
        id,
        item.id,
        target.displayOrder,
      );

      await updateSurveyQuestionOrder(
        id,
        target.id,
        item.displayOrder,
      );

      await load();

      setSuccess('Question order updated.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update question order.',
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function handleRemove(
    item: SurveyQuestion,
  ) {
    if (!id || isWorking) return;

    const confirmed = window.confirm(
      `Remove "${item.question.text}" from this survey?`,
    );

    if (!confirmed) return;

    setIsWorking(true);
    setError('');
    setSuccess('');

    try {
      await removeQuestionFromSurvey(
        id,
        item.id,
      );

      await load();

      setSuccess(
        'Question removed from the survey.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to remove question.',
      );
    } finally {
      setIsWorking(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-container py-10">
        <div className="animate-pulse">
          <div className="h-4 w-24 rounded bg-slate-200" />

          <div className="mt-4 h-9 w-96 rounded bg-slate-200" />

          <div className="mt-8 space-y-4">
            {Array.from({ length: 3 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-36 rounded-2xl border border-slate-200 bg-white"
                />
              ),
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="page-container py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">
            Unable to load survey
          </p>

          <p className="mt-1">
            {error || 'Survey could not be found.'}
          </p>

          <button
            type="button"
            onClick={() => navigate('/surveys')}
            className="btn-secondary mt-4"
          >
            Back to surveys
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-6 sm:py-8 lg:py-10">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
        <button
          type="button"
          onClick={() => navigate('/surveys')}
          className="transition hover:text-vasthav-700"
        >
          Surveys
        </button>

        <span>/</span>

        <button
          type="button"
          onClick={() =>
            navigate(`/surveys/${survey.id}`)
          }
          className="max-w-xs truncate transition hover:text-vasthav-700"
        >
          {survey.name}
        </button>

        <span>/</span>

        <span className="text-vasthav-700">
          Questions
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Survey questions
          </h1>

          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Build and organize the questions used by
            this survey.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() =>
              navigate(`/surveys/${survey.id}`)
            }
            className="btn-secondary w-full sm:w-auto"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                `/surveys/${survey.id}/questions/new`,
              )
            }
            className="btn-primary w-full sm:w-auto"
          >
            + Add question
          </button>
        </div>
      </div>

      {(error || success) && (
        <div
          role="status"
          className={`mt-6 rounded-xl border p-4 text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="mt-7 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {questions.length}{' '}
            {questions.length === 1
              ? 'question'
              : 'questions'}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Use the arrow controls to change question
            order.
          </p>
        </div>

        <button
          type="button"
          disabled={isLoading || isWorking}
          onClick={() => void load()}
          className="btn-secondary px-3 py-2 text-xs"
        >
          Refresh
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-card">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-vasthav-50 text-vasthav-700">
            <span className="text-xl font-extrabold">
              ?
            </span>
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            No questions yet
          </h2>

          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Add the first question to start building
            this survey.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                `/surveys/${survey.id}/questions/new`,
              )
            }
            className="btn-primary mt-5"
          >
            Add first question
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {questions.map((item, index) => (
            <QuestionCard
              key={item.id}
              item={item}
              index={index}
              total={questions.length}
              disabled={isWorking}
              onMove={(question, direction) =>
                void handleMove(
                  question,
                  direction,
                )
              }
              onRemove={(question) =>
                void handleRemove(question)
              }
              onEdit={(questionId) =>
                navigate(
                  `/surveys/${survey.id}/questions/${questionId}`,
                )
              }
            />
          ))}
        </div>
      )}

      {isWorking && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          Updating...
        </div>
      )}
    </div>
  );
}
