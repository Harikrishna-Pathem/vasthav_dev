import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getResponse } from '../../services/response.service';
import type {
  SurveyResponse,
  SurveyResponseAnswer,
} from '../../types/response';

function formatDate(value: string | null): string {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatAnswer(answer: unknown): string {
  if (answer === null || answer === undefined) {
    return '—';
  }

  if (typeof answer === 'boolean') {
    return answer ? 'Yes' : 'No';
  }

  if (Array.isArray(answer)) {
    return answer.length ? answer.join(', ') : '—';
  }

  if (typeof answer === 'object') {
    return JSON.stringify(answer);
  }

  return String(answer);
}

function AnswerCard({
  answer,
  index,
}: {
  answer: SurveyResponseAnswer;
  index: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-vasthav-50 text-sm font-bold text-vasthav-700">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">
                {answer.question.text}
              </h3>

              <p className="mt-1 font-mono text-xs text-slate-400">
                {answer.question.code}
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {answer.question.questionType}
            </span>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
              {formatAnswer(answer.answer)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResponseDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const [response, setResponse] = useState<SurveyResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadResponse() {
      if (!id) {
        setError('Response ID is missing.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const result = await getResponse(id);
        setResponse(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load response.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadResponse();
  }, [id]);

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-card">
          <p className="text-sm text-slate-500">
            Loading response...
          </p>
        </div>
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="page-container">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8">
          <h1 className="font-bold text-red-800">
            Unable to load response
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error || 'Response not found.'}
          </p>

          <Link
            to="/surveys"
            className="mt-5 inline-flex items-center text-sm font-semibold text-vasthav-700 hover:text-vasthav-800"
          >
            Back to surveys
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div>
        <Link
          to={`/surveys/${response.surveyId}/responses`}
          className="mb-3 inline-flex items-center text-sm font-semibold text-slate-500 transition hover:text-vasthav-700"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="mr-1.5 h-4 w-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 4l-5 6 5 6"
            />
          </svg>
          Back to responses
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-vasthav-700">
              {response.survey.code}
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Response details
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {response.survey.name}
            </p>
          </div>

          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {response.status}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Response ID
          </p>
          <p className="mt-2 break-all font-mono text-xs text-slate-700">
            {response.id}
          </p>
        </div>

        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Respondent
          </p>
          <p className="mt-2 break-all font-mono text-xs text-slate-700">
            {response.respondentId ?? 'Anonymous'}
          </p>
        </div>

        <div className="card">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Submitted
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            {formatDate(response.submittedAt)}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Answers
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {response.answers.length} answer
            {response.answers.length === 1 ? '' : 's'} submitted.
          </p>
        </div>

        <div className="space-y-4">
          {response.answers.map((answer, index) => (
            <AnswerCard
              key={answer.id}
              answer={answer}
              index={index}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Created
        </p>
        <p className="mt-2 text-sm text-slate-600">
          {formatDate(response.createdAt)}
        </p>
      </div>
    </div>
  );
}
