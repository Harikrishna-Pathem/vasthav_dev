import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  listResponsesBySurvey,
} from '../../services/response.service';
import type {
  SurveyResponseListItem,
  SurveyResponseListResponse,
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

function StatusBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      SUBMITTED
    </span>
  );
}

function ResponseRow({
  response,
}: {
  response: SurveyResponseListItem;
}) {
  return (
    <tr className="border-t border-slate-100 transition hover:bg-slate-50">
      <td className="px-5 py-4">
        <div className="font-mono text-xs text-slate-700">
          {response.id}
        </div>
      </td>

      <td className="px-5 py-4">
        <div className="font-mono text-xs text-slate-600">
          {response.respondentId ?? 'Anonymous'}
        </div>
      </td>

      <td className="px-5 py-4">
        <StatusBadge />
      </td>

      <td className="px-5 py-4 text-sm text-slate-600">
        {formatDate(response.submittedAt)}
      </td>

      <td className="px-5 py-4 text-right">
        <Link
          to={`/responses/${response.id}`}
          className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-vasthav-700 transition hover:bg-vasthav-50"
        >
          View
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="ml-1.5 h-4 w-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 4l5 6-5 6"
            />
          </svg>
        </Link>
      </td>
    </tr>
  );
}

export function SurveyResponsesPage() {
  const { id } = useParams<{ id: string }>();

  const [data, setData] =
    useState<SurveyResponseListResponse | null>(null);

  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadResponses(currentPage: number) {
    if (!id) {
      setError('Survey ID is missing.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await listResponsesBySurvey(id, {
        page: currentPage,
        limit: 20,
        status: 'SUBMITTED',
      });

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load survey responses.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadResponses(page);
  }, [id, page]);

  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.totalPages ?? 1;

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to={id ? `/surveys/${id}` : '/surveys'}
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
            Back to survey
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Survey Responses
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Review submitted responses for this survey.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Total responses
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {total}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Response
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Respondent
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  Submitted
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center text-sm text-slate-500"
                  >
                    Loading responses...
                  </td>
                </tr>
              ) : data?.items.length ? (
                data.items.map((response) => (
                  <ResponseRow
                    key={response.id}
                    response={response}
                  />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center"
                  >
                    <div className="mx-auto max-w-sm">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          className="h-6 w-6 text-slate-400"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 7h8M8 11h8M8 15h5"
                          />
                          <rect
                            x="4"
                            y="3"
                            width="16"
                            height="18"
                            rx="2"
                          />
                        </svg>
                      </div>

                      <p className="mt-4 font-semibold text-slate-800">
                        No responses yet
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Submitted survey responses will appear here.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && data && data.meta.total > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {data.meta.page} of {Math.max(totalPages, 1)}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
