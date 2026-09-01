import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  getQuestion,
  updateQuestion,
} from '../../services/question.service';
import { getSurvey } from '../../services/survey.service';

import type { Survey } from '../../types/survey';
import type {
  Question,
  QuestionType,
  UpdateQuestionRequest,
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
  id?: string;
  code: string;
  value: string;
}

export function EditQuestionPage() {
  const navigate = useNavigate();

  const { id: surveyId, questionId } =
    useParams<{
      id: string;
      questionId: string;
    }>();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);

  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const [description, setDescription] = useState('');

  const [questionType, setQuestionType] =
    useState<QuestionType>('SINGLE_CHOICE');

  const [required, setRequired] = useState(false);

  const [options, setOptions] =
    useState<OptionDraft[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isChoiceQuestion = useMemo(
    () =>
      questionType === 'SINGLE_CHOICE' ||
      questionType === 'MULTIPLE_CHOICE',
    [questionType],
  );

  useEffect(() => {
    async function load() {
      if (!surveyId || !questionId) {
        setError('Survey or question ID is missing.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const [surveyResponse, questionResponse] =
          await Promise.all([
            getSurvey(surveyId),
            getQuestion(questionId),
          ]);

        setSurvey(surveyResponse);
        setQuestion(questionResponse);

        setCode(questionResponse.code);
        setText(questionResponse.text);
        setDescription(
          questionResponse.description ?? '',
        );
        setQuestionType(
          questionResponse.questionType,
        );
        setRequired(questionResponse.required);

        setOptions(
          (questionResponse.options ?? [])
            .sort(
              (a, b) =>
                a.displayOrder - b.displayOrder,
            )
            .map((option) => ({
              id: option.id,
              code: option.code,
              value: option.value,
            })),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load question.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [surveyId, questionId]);

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

    setError('');
    setSuccess('');
  }

  function addOption() {
    setOptions((current) => [
      ...current,
      {
        code: `OPTION_${current.length + 1}`,
        value: '',
      },
    ]);

    setError('');
    setSuccess('');
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

    setError('');
    setSuccess('');
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!surveyId || !questionId) {
      setError('Survey or question ID is missing.');
      return;
    }

    if (!question) {
      setError('Question could not be loaded.');
      return;
    }

    if (question.status === 'PUBLISHED') {
      setError(
        'Published questions cannot be edited.',
      );
      return;
    }

    const trimmedCode = code.trim();
    const trimmedText = text.trim();
    const trimmedDescription =
      description.trim();

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
      UpdateQuestionRequest['options'] |
      undefined;

    if (isChoiceQuestion) {
      if (options.length < 2) {
        setError(
          'Choice questions must have at least two options.',
        );
        return;
      }

      const normalizedOptions = options.map(
        (option) => ({
          code: option.code.trim(),
          value: option.value.trim(),
        }),
      );

      const invalidOption =
        normalizedOptions.some(
          (option) =>
            !option.code || !option.value,
        );

      if (invalidOption) {
        setError(
          'Every option must have both a code and a value.',
        );
        return;
      }

      const codes = normalizedOptions.map(
        (option) => option.code.toLowerCase(),
      );

      if (
        new Set(codes).size !== codes.length
      ) {
        setError(
          'Option codes must be unique.',
        );
        return;
      }

      questionOptions =
        normalizedOptions.map(
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
    setSuccess('');

    try {
      const request: UpdateQuestionRequest = {
        code: trimmedCode,
        text: trimmedText,
        description:
          trimmedDescription || null,
        questionType,
        required,
        ...(questionOptions
          ? { options: questionOptions }
          : {}),
      };

      await updateQuestion(
        questionId,
        request,
      );

      setSuccess(
        'Question updated successfully.',
      );

      setTimeout(() => {
        navigate(
          `/surveys/${surveyId}/questions`,
          {
            replace: true,
          },
        );
      }, 600);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update question.',
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

  if (!survey || !question) {
    return (
      <div className="page-container py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">
            Unable to load question
          </p>

          <p className="mt-1">
            {error ||
              'Question could not be found.'}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                surveyId
                  ? `/surveys/${surveyId}/questions`
                  : '/surveys',
              )
            }
            className="btn-secondary mt-4"
          >
            Back to questions
          </button>
        </div>
      </div>
    );
  }

  const isPublished =
    question.status === 'PUBLISHED';

  return (
    <div className="page-container py-6 sm:py-8 lg:py-10">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
        <button
          type="button"
          onClick={() =>
            navigate('/surveys')
          }
          className="transition hover:text-vasthav-700"
        >
          Surveys
        </button>

        <span>/</span>

        <button
          type="button"
          onClick={() =>
            navigate(
              `/surveys/${survey.id}`,
            )
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
          Edit
        </span>
      </div>

      <div className="mt-3 max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Edit question
          </h1>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {question.status}
          </span>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
          Update this reusable question and its
          answer options.
        </p>
      </div>

      {isPublished && (
        <div className="mt-6 max-w-4xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">
            This question is published
          </p>
          <p className="mt-1">
            Published questions cannot be
            destructively modified. Create a new
            question version instead.
          </p>
        </div>
      )}

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
              Update what respondents will see
              and how they should answer.
            </p>
          </div>

          <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <p className="font-semibold">
                  Unable to update question
                </p>

                <p className="mt-1">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
              >
                {success}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="question-code"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Question code
                </label>

                <input
                  id="question-code"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value)
                  }
                  maxLength={120}
                  autoComplete="off"
                  disabled={isPublished}
                  className="form-input disabled:cursor-not-allowed disabled:bg-slate-100"
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  Maximum 120 characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="question-status"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Current status
                </label>

                <input
                  id="question-status"
                  value={question.status}
                  disabled
                  className="form-input cursor-not-allowed bg-slate-100"
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  Status is managed separately.
                </p>
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
                rows={4}
                maxLength={2000}
                disabled={isPublished}
                className="form-input resize-y disabled:cursor-not-allowed disabled:bg-slate-100"
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
                rows={4}
                maxLength={2000}
                disabled={isPublished}
                className="form-input resize-y disabled:cursor-not-allowed disabled:bg-slate-100"
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
                disabled={isPublished}
                className="form-input disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {questionTypes.map(
                  (type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ),
                )}
              </select>

              <p className="mt-1.5 text-xs text-slate-400">
                {
                  questionTypes.find(
                    (type) =>
                      type.value ===
                      questionType,
                  )?.description
                }
              </p>
            </div>

            <label
              className={`flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 ${
                isPublished
                  ? 'cursor-not-allowed opacity-70'
                  : 'cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={required}
                onChange={(event) =>
                  setRequired(
                    event.target.checked,
                  )
                }
                disabled={isPublished}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-vasthav-700 focus:ring-vasthav-500"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Required question
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  Respondents must provide an
                  answer before continuing.
                </span>
              </span>
            </label>

            {isChoiceQuestion && (
              <div
                className={`rounded-2xl border border-slate-200 ${
                  isPublished
                    ? 'opacity-70'
                    : ''
                }`}
              >
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Answer options
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Add at least two options.
                        Codes must be unique.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addOption}
                      disabled={isPublished}
                      className="btn-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      + Add option
                    </button>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  {options.map(
                    (option, index) => (
                      <div
                        key={
                          option.id ??
                          `new-${index}`
                        }
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
                            value={
                              option.code
                            }
                            onChange={(
                              event,
                            ) =>
                              updateOption(
                                index,
                                'code',
                                event.target
                                  .value,
                              )
                            }
                            disabled={
                              isPublished
                            }
                            className="form-input disabled:cursor-not-allowed disabled:bg-slate-100"
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
                            value={
                              option.value
                            }
                            onChange={(
                              event,
                            ) =>
                              updateOption(
                                index,
                                'value',
                                event.target
                                  .value,
                              )
                            }
                            disabled={
                              isPublished
                            }
                            className="form-input disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() =>
                              removeOption(
                                index,
                              )
                            }
                            disabled={
                              isPublished ||
                              options.length <=
                                2
                            }
                            className="rounded-xl border border-red-200 bg-white px-3 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ),
                  )}
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
              disabled={
                isSubmitting ||
                isPublished
              }
              className="btn-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? 'Saving...'
                : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
