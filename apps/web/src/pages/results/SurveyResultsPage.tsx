import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getSurveyResults } from '../../services/survey-results.service';
import type { SurveyResultQuestion, SurveyResults } from '../../types/survey-results';

function formatNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value);
}

function ProgressBar({
  label,
  value,
  color = 'bg-vasthav-600',
}: {
  label: string;
  value: number;
  color?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className="h-2.5 overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safeValue)}
    >
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function QuestionResultCard({ question }: { question: SurveyResultQuestion }) {
  let content: ReactNode;

  switch (question.type) {
    case 'TEXT':
      content = (
        <>
          <p className="text-sm font-semibold text-slate-700">
            {question.results.totalAnswered} {question.results.totalAnswered === 1 ? 'answer' : 'answers'}
          </p>
          {question.results.values.length ? (
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {question.results.values.map((value, index) => (
                <li
                  key={`${question.id}-${index}`}
                  className="whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  {value}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No text answers yet.</p>
          )}
        </>
      );
      break;

    case 'NUMBER':
      content = (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Count', question.results.count],
            ['Minimum', formatNumber(question.results.minimum)],
            ['Maximum', formatNumber(question.results.maximum)],
            ['Average', formatNumber(question.results.average)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 text-lg font-bold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      );
      break;

    case 'BOOLEAN': {
      const yesPercentage = question.results.total
        ? (question.results.trueCount / question.results.total) * 100
        : 0;
      const noPercentage = question.results.total
        ? (question.results.falseCount / question.results.total) * 100
        : 0;
      content = (
        <div>
          <p className="mb-4 text-sm font-semibold text-slate-700">
            {question.results.total} {question.results.total === 1 ? 'response' : 'responses'}
          </p>
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex justify-between gap-4 text-sm">
                <span className="font-medium text-slate-700">Yes / True</span>
                <span className="text-slate-500">
                  {question.results.trueCount} · {formatNumber(yesPercentage)}%
                </span>
              </div>
              <ProgressBar label="Yes or true responses" value={yesPercentage} />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between gap-4 text-sm">
                <span className="font-medium text-slate-700">No / False</span>
                <span className="text-slate-500">
                  {question.results.falseCount} · {formatNumber(noPercentage)}%
                </span>
              </div>
              <ProgressBar label="No or false responses" value={noPercentage} color="bg-slate-400" />
            </div>
          </div>
        </div>
      );
      break;
    }

    case 'SINGLE_CHOICE':
    case 'MULTIPLE_CHOICE': {
      const total = question.type === 'SINGLE_CHOICE'
        ? question.results.totalAnswers
        : question.results.totalResponses;
      content = (
        <div>
          <p className="mb-4 text-sm font-semibold text-slate-700">
            {total} {total === 1 ? 'respondent' : 'respondents'}
          </p>
          {question.type === 'MULTIPLE_CHOICE' && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Percentages are based on respondents. Since respondents can select multiple options, the total may exceed 100%.
            </p>
          )}
          {question.results.options.length ? (
            <div className="space-y-4">
              {question.results.options.map((option) => (
                <div key={option.code}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-4">
                    <span className="min-w-0 break-words text-sm font-medium text-slate-700">
                      {option.label}
                    </span>
                    <span className="shrink-0 text-sm text-slate-500">
                      {option.count} · {formatNumber(option.percentage)}%
                    </span>
                  </div>
                  <ProgressBar
                    label={`${option.label}: ${option.count} respondents, ${formatNumber(option.percentage)} percent`}
                    value={option.percentage}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No options are available for this question.</p>
          )}
        </div>
      );
      break;
    }

    case 'DATE':
      content = (
        <p className="text-sm font-semibold text-slate-700">
          {question.results.totalAnswered} {question.results.totalAnswered === 1 ? 'answer' : 'answers'}
        </p>
      );
      break;

    default:
      content = (
        <p className="text-sm text-slate-500">No analytics available for this question type.</p>
      );
  }

  return (
    <article className="card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-vasthav-50 text-sm font-bold text-vasthav-700">
          {question.displayOrder}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">{question.text}</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {question.type.replace('_', ' ').toLowerCase()}
          </p>
        </div>
      </div>
      {content}
    </article>
  );
}

export function SurveyResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SurveyResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadResults = useCallback(async () => {
    if (!id) {
      setError('Survey ID is missing.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      setData(await getSurveyResults(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load survey results.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  if (isLoading) {
    return (
      <main className="page-container space-y-6 py-8" aria-busy="true" aria-live="polite">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
        <div className="card p-6">
          <div className="h-7 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-40 animate-pulse rounded bg-slate-100" />
        </div>
        <p className="text-sm text-slate-500">Loading survey results…</p>
        <div className="grid gap-5 lg:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="card h-48 animate-pulse bg-slate-100" />
          ))}
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="page-container space-y-5 py-8">
        <Link
          to={id ? `/surveys/${id}` : '/surveys'}
          className="inline-flex text-sm font-semibold text-slate-500 transition hover:text-vasthav-700"
        >
          ← Back to survey
        </Link>
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6" role="alert">
          <h1 className="text-lg font-bold text-red-800">Unable to load results</h1>
          <p className="mt-2 text-sm text-red-700">{error || 'Survey results are unavailable.'}</p>
          <button type="button" onClick={() => void loadResults()} className="btn-secondary mt-4">
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container space-y-6 py-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            to={`/surveys/${data.survey.id}`}
            className="mb-3 inline-flex text-sm font-semibold text-slate-500 transition hover:text-vasthav-700"
          >
            ← Back to survey
          </Link>
          <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {data.survey.name}
          </h1>
          <p className="mt-2 font-mono text-sm text-slate-500">{data.survey.code}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card sm:min-w-48">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Submitted responses
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{data.totalResponses}</p>
        </div>
      </header>

      <section className="card flex items-center justify-between gap-4 p-5 sm:p-6" aria-labelledby="results-summary">
        <div>
          <h2 id="results-summary" className="text-sm font-semibold text-slate-500">Total responses</h2>
          <p className="mt-1 text-3xl font-bold tracking-tight text-vasthav-700">{data.totalResponses}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-vasthav-50 text-vasthav-700" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 15v-4m4 4V7m4 8V9m4 6V6" />
          </svg>
        </div>
      </section>

      {data.totalResponses === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          No submitted responses yet. Results will appear here after respondents submit the survey.
        </div>
      )}

      <section aria-labelledby="question-results-heading">
        <div className="mb-4">
          <h2 id="question-results-heading" className="text-lg font-bold text-slate-900">Question results</h2>
          <p className="mt-1 text-sm text-slate-500">Analytics from submitted responses.</p>
        </div>
        {data.questions.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {data.questions.map((question) => (
              <QuestionResultCard key={question.id} question={question} />
            ))}
          </div>
        ) : (
          <div className="card px-5 py-12 text-center">
            <p className="font-semibold text-slate-700">No questions in this survey</p>
            <p className="mt-1 text-sm text-slate-500">Add questions to see their results here.</p>
          </div>
        )}
      </section>
    </main>
  );
}
