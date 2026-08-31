import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  addQuestionToSurvey,
  createQuestion,
} from '../../services/question.service';
import { getSurvey } from '../../services/survey.service';

import type { Survey } from '../../types/survey';

import type {
  CreateQuestionRequest,
  QuestionType,
} from '../../types/question';

const questionTypes: Array<{
  value: QuestionType;
  label: string;
  description: string;
}> = [
  {
    value: 'SINGLE_CHOICE',
    label: 'Single choice',
    description: 'Respondent selects one option.',
  },
  {
    value: 'MULTIPLE_CHOICE',
    label: 'Multiple choice',
    description: 'Respondent can select multiple options.',
  },
  {
    value: 'TEXT',
    label: 'Text',
    description: 'Short or long text response.',
  },
  {
    value: 'NUMBER',
    label: 'Number',
    description: 'Numeric response.',
  },
  {
    value: 'DATE',
    label: 'Date',
    description: 'Date response.',
  },
  {
    value: 'BOOLEAN',
    label: 'Yes / No',
    description: 'Boolean response.',
  },
  {
    value: 'IMAGE',
    label: 'Image',
    description: 'Image upload response.',
  },
  {
    value: 'VIDEO',
    label: 'Video',
    description: 'Video upload response.',
  },
  {
    value: 'FILE',
    label: 'File',
    description: 'File upload response.',
  },
];

interface OptionDraft {
  code: string;
  value: string;
}

const initialOptions: OptionDraft[] = [
  {
    code: 'OPTION_1',
    value: '',
  },
  {
    code: 'OPTION_2',
    value: '',
  },
];

export function CreateQuestionPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [survey, setSurvey] = useState<Survey | null>(null);

  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const [description, setDescription] = useState('');

  const [questionType, setQuestionType] =
    useState<QuestionType>('SINGLE_CHOICE');

  const [required, setRequired] = useState(false);

  const [status, setStatus] = useState<
    'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  >('DRAFT');

  const [options, setOptions] =
    useState<OptionDraft[]>(initialOptions);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState('');

  const isChoiceQuestion = useMemo(
    () =>
      questionType === 'SINGLE_CHOICE' ||
      questionType === 'MULTIPLE_CHOICE',
    [questionType],
  );

  useEffect(() => {
    async function loadSurvey() {
      if (!id) {
        setError('Survey ID is missing.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await getSurvey(id);
        setSurvey(response);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load survey.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadSurvey();
  }, [id]);

  function updateOption(
    index: number,
    field: keyof OptionDraft,
    value: string,
  ) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index
          ? {
              ...option,
              [field]: value,
            }
          : option,
      ),
    );

    if (error) {
      setError('');
    }
  }

  function addOption() {
    setOptions((current) => [
      ...current,
      {
        code: `OPTION_${current.length + 1}`,
        value: '',
      },
    ]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) {
      setError(
        'Choice questions must have at least two options.',
      );
      return;
    }

    setOptions((current) =>
      current.filter(
        (_, optionIndex) => optionIndex !== index,
      ),
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!id) {
      setError('Survey ID is missing.');
      return;
    }

    const trimmedCode = code.trim();
    const trimmedText = text.trim();
    const trimmedDescription = description.trim();

    if (!trimmedText) {
      setError('Question text is required.');
      return;
    }

    if (trimmedText.length > 2000) {
      setError(
        'Question text must be 2000 characters or fewer.',
      );
      return;
    }

    if (trimmedCode.length > 120) {
      setError(
        'Question code must be 120 characters or fewer.',
      );
      return;
    }

    let questionOptions:
      | CreateQuestionRequest['options']
      | undefined;

    if (isChoiceQuestion) {
      if (options.length < 2) {
        setError(
          'Choice questions must have at least two options.',
        );
        return;
      }

      const normalizedOptions = options.map((option) => ({
        code: option.code.trim(),
        value: option.value.trim(),
      }));

      const invalidOption = normalizedOptions.some(
        (option) => !option.code || !option.value,
      );

      if (invalidOption) {
        setError(
          'Every option must have both a code and a value.',
        );
        return;
      }

      const codes = normalizedOptions.map((option) =>
        option.code.toLowerCase(),
      );

      if (new Set(codes).size !== codes.length) {
        setError('Option codes must be unique.');
        return;
      }

      questionOptions = normalizedOptions.map(
        (option, index) => ({
          code: option.code,
          value: option.value,
          displayOrder: index + 1,
          status: 'ACTIVE',
        }),
      );
    }

    setIsSubmitting(true);
    setError('');

    try {
      const request: CreateQuestionRequest = {
        code: trimmedCode || undefined,
        text: trimmedText,
        description:
          trimmedDescription || undefined,
        questionType,
        required,
        status,
        ...(questionOptions
          ? { options: questionOptions }
          : {}),
      };

      const question = await createQuestion(request);

      await addQuestionToSurvey(
        id,
        question.id,
      );

      navigate(`/surveys/${id}/questions`, {
        replace: true,
        state: {
          created: true,
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create question.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-container py-10">
        <div className="animate-pulse">
          <div className="h-4 w-32 rounded bg-slate-200" />

          <div className="mt-4 h-9 w-96 rounded bg-slate-200" />

          <div className="mt-8 max-w-4xl rounded-2xl border border-slate-200 bg-white p-7">
            <div className="h-5 w-48 rounded bg-slate-100" />

            <div className="mt-7 space-y-5">
              <div className="h-12 rounded-xl bg-slate-100" />
              <div className="h-32 rounded-xl bg-slate-100" />
              <div className="h-12 rounded-xl bg-slate-100" />
            </div>
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

        <button
          type="button"
          onClick={() =>
            navigate(
              `/surveys/${survey.id}/questions`,
            )
          }
          className="transition hover:text-vasthav-700"
        >
          Questions
        </button>

        <span>/</span>

        <span className="text-vasthav-700">
          New question
        </span>
      </div>

      <div className="mt-3 max-w-4xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Add question
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
          Create a reusable question and add it to this
          survey.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-7 max-w-4xl"
        noValidate
      >
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <h2 className="text-base font-bold text-slate-900">
              Question information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Define what respondents will see and how they
              should answer.
            </p>
          </div>

          <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <p className="font-semibold">
                  Unable to create question
                </p>

                <p className="mt-1">{error}</p>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="question-code"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Question code
                  <span className="ml-1 text-xs font-medium text-slate-400">
                    Optional
                  </span>
                </label>

                <input
                  id="question-code"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value)
                  }
                  placeholder="e.g. HOUSEHOLD_SIZE"
                  maxLength={120}
                  autoComplete="off"
                  className="form-input"
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  Leave blank to let the server generate a
                  code.
                </p>
              </div>

              <div>
                <label
                  htmlFor="question-status"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Initial status
                </label>

                <select
                  id="question-status"
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as
                        | 'DRAFT'
                        | 'PUBLISHED'
                        | 'ARCHIVED',
                    )
                  }
                  className="form-input"
                >
                  <option value="DRAFT">
                    Draft
                  </option>

                  <option value="PUBLISHED">
                    Published
                  </option>

                  <option value="ARCHIVED">
                    Archived
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="question-text"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Question text
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <textarea
                id="question-text"
                value={text}
                onChange={(event) =>
                  setText(event.target.value)
                }
                placeholder="e.g. How many people live in your household?"
                rows={4}
                maxLength={2000}
                autoFocus
                className="form-input resize-y"
              />

              <div className="mt-1.5 flex justify-end">
                <span className="text-[11px] font-medium text-slate-400">
                  {text.length}/2000
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="question-description"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Description
                <span className="ml-1 text-xs font-medium text-slate-400">
                  Optional
                </span>
              </label>

              <textarea
                id="question-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Add guidance or context for this question..."
                rows={4}
                maxLength={2000}
                className="form-input resize-y"
              />
            </div>

            <div>
              <label
                htmlFor="question-type"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Question type
              </label>

              <select
                id="question-type"
                value={questionType}
                onChange={(event) =>
                  setQuestionType(
                    event.target.value as QuestionType,
                  )
                }
                className="form-input"
              >
                {questionTypes.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>

              <p className="mt-1.5 text-xs text-slate-400">
                {
                  questionTypes.find(
                    (type) => type.value === questionType,
                  )?.description
                }
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={required}
                onChange={(event) =>
                  setRequired(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-vasthav-700 focus:ring-vasthav-500"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Required question
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  Respondents must provide an answer before
                  continuing.
                </span>
              </span>
            </label>

            {isChoiceQuestion && (
              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Answer options
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Add at least two options. Codes must
                        be unique.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addOption}
                      className="btn-secondary px-3 py-2 text-xs"
                    >
                      + Add option
                    </button>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  {options.map((option, index) => (
                    <div
                      key={index}
                      className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]"
                    >
                      <div>
                        <label
                          htmlFor={`option-code-${index}`}
                          className="mb-1.5 block text-xs font-semibold text-slate-700"
                        >
                          Code
                        </label>

                        <input
                          id={`option-code-${index}`}
                          value={option.code}
                          onChange={(event) =>
                            updateOption(
                              index,
                              'code',
                              event.target.value,
                            )
                          }
                          className="form-input"
                          placeholder="OPTION_1"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`option-value-${index}`}
                          className="mb-1.5 block text-xs font-semibold text-slate-700"
                        >
                          Value
                        </label>

                        <input
                          id={`option-value-${index}`}
                          value={option.value}
                          onChange={(event) =>
                            updateOption(
                              index,
                              'value',
                              event.target.value,
                            )
                          }
                          className="form-input"
                          placeholder="Option displayed to respondent"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() =>
                            removeOption(index)
                          }
                          disabled={options.length <= 2}
                          className="rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/surveys/${survey.id}/questions`,
                )
              }
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
              {isSubmitting
                ? 'Creating...'
                : 'Create question'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
