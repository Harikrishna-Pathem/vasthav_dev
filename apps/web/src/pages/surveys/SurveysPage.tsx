import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { listSurveys } from '../../services/survey.service';
import type {
  Survey,
  SurveyListResponse,
  SurveyStatus,
  UserLanguage,
} from '../../types/survey';

const PAGE_SIZE = 10;

const statusOptions: Array<{
  value: '' | SurveyStatus;
  label: string;
}> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const languageOptions: Array<{
  value: '' | UserLanguage;
  label: string;
}> = [
  { value: '', label: 'Default language' },
  { value: 'en', label: 'English' },
  { value: 'te', label: 'Telugu' },
  { value: 'hi', label: 'Hindi' },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function statusClasses(status: SurveyStatus): string {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    case 'ARCHIVED':
      return 'bg-slate-100 text-slate-600 ring-slate-500/20';
    default:
      return 'bg-amber-50 text-amber-700 ring-amber-600/20';
  }
}

function StatusBadge({ status }: { status: SurveyStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusClasses(status)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function SurveyCard({
  survey,
  onOpen,
}: {
  survey: Survey;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(survey.id)}
      className="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-vasthav-200 hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-vasthav-500 focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-vasthav-50 text-vasthav-700 transition group-hover:bg-vasthav-100">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 3.75h8.5L20 8.25v12A1.75 1.75 0 0 1 18.25 22h-10A1.75 1.75 0 0 1 6.5 20.25v-14A2.5 2.5 0 0 1 9 3.75h6.5L20 8.25"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 3.75v4.5h5M9.5 12h5M9.5 15.5h5"
            />
          </svg>
        </div>

        <StatusBadge status={survey.status} />
      </div>

      <div className="mt-5">
        <h3 className="line-clamp-2 text-base font-bold text-slate-900 group-hover:text-vasthav-700">
          {survey.name}
        </h3>

        <p className="mt-1 text-xs font-medium text-slate-400">
          {survey.code}
        </p>

        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
          {survey.description || 'No description provided.'}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
        <span>Version {survey.version}</span>
        <span>{formatDate(survey.updatedAt)}</span>
      </div>
    </button>
  );
}

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex justify-between">
        <div className="h-11 w-11 rounded-xl bg-slate-100" />
        <div className="h-6 w-20 rounded-full bg-slate-100" />
      </div>
      <div className="mt-5 h-5 w-3/4 rounded bg-slate-100" />
      <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
      <div className="mt-4 h-10 rounded bg-slate-100" />
      <div className="mt-5 h-4 rounded bg-slate-100" />
    </div>
  );
}

export function SurveysPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [result, setResult] = useState<SurveyListResponse | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | SurveyStatus>('');
  const [language, setLanguage] = useState<'' | UserLanguage>('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSurveys = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await listSurveys({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        status: status || undefined,
        language: language || undefined,
      });

      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load surveys.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [language, page, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSurveys();
    }, search ? 300 : 0);

    return () => window.clearTimeout(timer);
  }, [loadSurveys, search]);

  const surveys = result?.data ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((result?.total ?? 0) / PAGE_SIZE),
  );

  const rangeText = useMemo(() => {
    if (!result || result.total === 0) {
      return '0 surveys';
    }

    const start = (result.page - 1) * result.limit + 1;
    const end = Math.min(
      result.page * result.limit,
      result.total,
    );

    return `${start}-${end} of ${result.total} surveys`;
  }, [result]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatus(value: '' | SurveyStatus) {
    setStatus(value);
    setPage(1);
  }

  function handleLanguage(value: '' | UserLanguage) {
    setLanguage(value);
    setPage(1);
  }

  return (
    <div className="page-container py-6 sm:py-8 lg:py-10">
      {/* Page heading */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
            <span>Workspace</span>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08 0Z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-vasthav-700">Surveys</span>
          </div>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Surveys
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500 sm:text-base">
            Create, manage, and organize your survey forms.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/surveys/new')}
          className="btn-primary w-full sm:w-auto"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mr-2 h-4 w-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              d="M10 4v12M4 10h12"
            />
          </svg>
          New survey
        </button>
      </div>

      {/* Filters */}
      <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="relative block">
            <span className="sr-only">Search surveys</span>

            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path
                strokeLinecap="round"
                d="m16 16 4.25 4.25"
              />
            </svg>

            <input
              value={search}
              onChange={(event) =>
                handleSearch(event.target.value)
              }
              placeholder="Search surveys..."
              className="form-input pl-11"
            />
          </label>

          <label>
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(event) =>
                handleStatus(
                  event.target.value as '' | SurveyStatus,
                )
              }
              className="form-input"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Filter by language</span>
            <select
              value={language}
              onChange={(event) =>
                handleLanguage(
                  event.target.value as '' | UserLanguage,
                )
              }
              className="form-input"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Results header */}
      <div className="mt-7 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {isLoading ? 'Loading surveys...' : rangeText}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadSurveys()}
          disabled={isLoading}
          className="btn-secondary px-3 py-2 text-xs sm:px-4 sm:text-sm"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className={`mr-1.5 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 11a8.1 8.1 0 0 0-14.85-4.5L4 8M4 5v3h3M4 13a8.1 8.1 0 0 0 14.85 4.5L20 16m0 3v-3h-3"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-3">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 8v4M12 16h.01" />
            </svg>

            <div>
              <p className="font-semibold">
                Unable to load surveys
              </p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingCard key={index} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && surveys.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-card">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-vasthav-50 text-vasthav-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 3.75h8.5L20 8.25v12A1.75 1.75 0 0 1 18.25 22h-10A1.75 1.75 0 0 1 6.5 20.25v-14A2.5 2.5 0 0 1 9 3.75h6.5L20 8.25"
              />
              <path
                strokeLinecap="round"
                d="M15 3.75v4.5h5M9.5 12h5M9.5 15.5h3"
              />
            </svg>
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            No surveys found
          </h2>

          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {search || status || language
              ? 'Try changing your filters or search terms.'
              : 'Create your first survey to get started.'}
          </p>

          {!search && !status && !language && (
            <button
              type="button"
              onClick={() => navigate('/surveys/new')}
              className="btn-primary mt-5"
            >
              Create survey
            </button>
          )}
        </div>
      )}

      {/* Survey grid */}
      {!isLoading && !error && surveys.length > 0 && (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {surveys.map((survey) => (
              <SurveyCard
                key={survey.id}
                survey={survey}
                onOpen={(id) => navigate(`/surveys/${id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-7 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-slate-500">
                Page {page} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  className="btn-secondary px-3 py-2 text-xs disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="grid h-9 min-w-9 place-items-center rounded-lg bg-vasthav-700 px-2 text-xs font-bold text-white">
                  {page}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1),
                    )
                  }
                  className="btn-secondary px-3 py-2 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Translation helper for existing i18n setup */}
      <span className="sr-only">{t('appName')}</span>
    </div>
  );
}
