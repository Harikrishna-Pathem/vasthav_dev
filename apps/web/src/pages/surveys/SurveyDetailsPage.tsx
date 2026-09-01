import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  getSurvey,
  updateSurvey,
  updateSurveyStatus,
} from '../../services/survey.service';
import type { Survey, SurveyStatus } from '../../types/survey';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${statusClasses(status)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function SurveyDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadSurvey() {
    if (!id) {
      setError('Survey ID is missing.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await getSurvey(id);

      setSurvey(response);
      setName(response.name);
      setCode(response.code);
      setDescription(response.description ?? '');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load the survey.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSurvey();
  }, [id]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!id) return;

    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError('Survey name is required.');
      return;
    }

    if (trimmedCode.length > 120) {
      setError('Survey code must be 120 characters or fewer.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await updateSurvey(id, {
        name: trimmedName,
        code: trimmedCode,
        description: trimmedDescription || null,
      });

      setSurvey((current) =>
        current
          ? {
              ...current,
              ...updated,
            }
          : updated,
      );

      setName(updated.name);
      setCode(updated.code);
      setDescription(updated.description ?? '');
      setSuccess('Survey details saved successfully.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save survey details.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(status: SurveyStatus) {
    if (!id || !survey || status === survey.status) return;

    setIsChangingStatus(true);
    setError('');
    setSuccess('');

    try {
      const updated = await updateSurveyStatus(id, { status });

      setSurvey((current) =>
        current
          ? {
              ...current,
              ...updated,
            }
          : updated,
      );

      setSuccess(`Survey status changed to ${updated.status}.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update survey status.',
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-container py-10">
        <div className="animate-pulse">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="mt-4 h-9 w-80 rounded bg-slate-200" />
          <div className="mt-8 max-w-4xl rounded-2xl border border-slate-200 bg-white p-7">
            <div className="h-5 w-48 rounded bg-slate-100" />
            <div className="mt-7 grid gap-6 md:grid-cols-2">
              <div className="h-12 rounded-xl bg-slate-100" />
              <div className="h-12 rounded-xl bg-slate-100" />
            </div>
            <div className="mt-6 h-32 rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="page-container py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">Unable to load survey</p>
          <p className="mt-1">{error}</p>
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

  if (!survey) {
    return null;
  }

  const isPublished = survey.status === 'PUBLISHED';

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

        <span className="truncate text-vasthav-700">
          {survey.name}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              {survey.name}
            </h1>
            <StatusBadge status={survey.status} />
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Manage survey information, questions, and translations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/surveys')}
          className="btn-secondary w-full sm:w-auto"
        >
          Back to surveys
        </button>
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

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={handleSave} className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <h2 className="text-base font-bold text-slate-900">
              Survey information
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Update the basic information for this survey.
            </p>
          </div>

          <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="survey-name"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Survey name
                </label>

                <input
                  id="survey-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={2000}
                  disabled={isPublished || isSaving}
                  className="form-input disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="survey-code"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Survey code
                </label>

                <input
                  id="survey-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  maxLength={120}
                  disabled={isPublished || isSaving}
                  className="form-input disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="survey-description"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Description
              </label>

              <textarea
                id="survey-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                rows={6}
                disabled={isPublished || isSaving}
                className="form-input resize-y disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            {isPublished && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Published surveys are locked against destructive edits.
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-7">
            <button
              type="submit"
              disabled={isSaving || isPublished}
              className="btn-primary w-full sm:w-auto"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="card p-5">
            <h2 className="text-base font-bold text-slate-900">
              Survey status
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Change the lifecycle status of this survey.
            </p>

            <div className="mt-5 space-y-2">
              {(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as SurveyStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={
                      isChangingStatus || status === survey.status
                    }
                    onClick={() => void handleStatusChange(status)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      status === survey.status
                        ? 'border-vasthav-200 bg-vasthav-50 text-vasthav-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {status}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-bold text-slate-900">
              Survey metadata
            </h2>

            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Version
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">
                  {survey.version}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-slate-600">
                  {formatDate(survey.createdAt)}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Last updated
                </dt>
                <dd className="mt-1 text-sm text-slate-600">
                  {formatDate(survey.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-bold text-slate-900">
              Next steps
            </h2>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => navigate(`/surveys/${survey.id}/questions`)}
                className="btn-secondary w-full"
              >
                Manage questions
              </button>

              <button
                type="button"
                onClick={() => navigate(`/surveys/${survey.id}/translations`)}
                className="btn-secondary w-full"
              >
                Manage translations
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
