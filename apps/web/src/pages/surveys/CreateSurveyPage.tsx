import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { createSurvey } from '../../services/survey.service';
import type { SurveyStatus } from '../../types/survey';

interface FormState {
  name: string;
  code: string;
  description: string;
  status: SurveyStatus;
}

const initialForm: FormState = {
  name: '',
  code: '',
  description: '',
  status: 'DRAFT',
};

export function CreateSurveyPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (error) {
      setError('');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();
    const code = form.code.trim();
    const description = form.description.trim();

    if (!name) {
      setError('Survey name is required.');
      return;
    }

    if (name.length > 2000) {
      setError('Survey name must be 2000 characters or fewer.');
      return;
    }

    if (code.length > 120) {
      setError('Survey code must be 120 characters or fewer.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await createSurvey({
        name,
        code: code || undefined,
        description: description || undefined,
        status: form.status,
      });

      navigate('/surveys', {
        replace: true,
        state: { created: true },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create the survey.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-container py-6 sm:py-8 lg:py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
        <button
          type="button"
          onClick={() => navigate('/surveys')}
          className="transition hover:text-vasthav-700"
        >
          Surveys
        </button>

        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 0 1 .02-1.06L10.94 10 7.23 6.29a.75.75 0 1 1 1.06-1.06l4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1 0 1.06l-4.24 4.24a.75.75 0 0 1-1.08 0Z"
            clipRule="evenodd"
          />
        </svg>

        <span className="text-vasthav-700">New survey</span>
      </div>

      {/* Header */}
      <div className="mt-3 max-w-3xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Create a new survey
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
          Set up the basic survey information. You can add questions
          and translations after creating the survey.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="mt-7 max-w-4xl"
        noValidate
      >
        <div className="card overflow-hidden">
          {/* Section header */}
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-vasthav-50 text-vasthav-700">
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

              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Survey information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Provide the details that identify this survey.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
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
                    <path
                      strokeLinecap="round"
                      d="M12 8v4M12 16h.01"
                    />
                  </svg>

                  <div>
                    <p className="font-semibold">
                      Unable to create survey
                    </p>
                    <p className="mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Name + Code */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="survey-name"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Survey name
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  id="survey-name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateField('name', event.target.value)
                  }
                  placeholder="e.g. Household Survey 2026"
                  maxLength={2000}
                  autoComplete="off"
                  autoFocus
                  className="form-input"
                />

                <div className="mt-1.5 flex justify-end">
                  <span className="text-[11px] font-medium text-slate-400">
                    {form.name.length}/2000
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="survey-code"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Survey code
                  <span className="ml-1 text-xs font-medium text-slate-400">
                    Optional
                  </span>
                </label>

                <input
                  id="survey-code"
                  type="text"
                  value={form.code}
                  onChange={(event) =>
                    updateField('code', event.target.value)
                  }
                  placeholder="e.g. household-survey-2026"
                  maxLength={120}
                  autoComplete="off"
                  className="form-input"
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  Leave blank to generate a code from the survey name.
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="survey-description"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Description
                <span className="ml-1 text-xs font-medium text-slate-400">
                  Optional
                </span>
              </label>

              <textarea
                id="survey-description"
                value={form.description}
                onChange={(event) =>
                  updateField('description', event.target.value)
                }
                placeholder="Briefly describe the purpose of this survey..."
                rows={5}
                maxLength={2000}
                className="form-input min-h-32 resize-y"
              />

              <div className="mt-1.5 flex justify-end">
                <span className="text-[11px] font-medium text-slate-400">
                  {form.description.length}/2000
                </span>
              </div>
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="survey-status"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Initial status
              </label>

              <select
                id="survey-status"
                value={form.status}
                onChange={(event) =>
                  updateField(
                    'status',
                    event.target.value as SurveyStatus,
                  )
                }
                className="form-input max-w-md"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>

              <p className="mt-1.5 text-xs text-slate-400">
                Draft is recommended while you are building the survey.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button
              type="button"
              onClick={() => navigate('/surveys')}
              disabled={isSubmitting}
              className="btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="opacity-25"
                    />
                    <path
                      d="M21 12a9 9 0 0 0-9-9"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
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
                  Create survey
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
