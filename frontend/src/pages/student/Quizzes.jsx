import { useEffect, useState } from "react";
import { CheckCircle2, Clock, RefreshCw } from "lucide-react";
import Button from "../../components/Button";
import {
  fetchStudentQuiz,
  fetchStudentQuizzes,
  submitStudentQuiz,
} from "../../services/apiQuiz";

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const response = await fetchStudentQuizzes();
      setQuizzes(response?.data || []);
      setNotice({ type: "", message: "" });
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to load quizzes.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const openQuiz = async (quizId) => {
    setLoading(true);
    setNotice({ type: "", message: "" });
    try {
      const response = await fetchStudentQuiz(quizId);
      setActiveQuiz(response?.data || null);
      setAnswers({});
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Quiz is not open right now.",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    const payload = activeQuiz.questions.map((question) => ({
      questionId: question.id,
      selectedOption: answers[question.id],
    }));

    setSubmitting(true);
    setNotice({ type: "", message: "" });
    try {
      const response = await submitStudentQuiz(activeQuiz.id, payload);
      setNotice({
        type: "success",
        message: `Submitted. Score: ${response?.data?.obtainedMarks}/${response?.data?.fullMarks}`,
      });
      setActiveQuiz(null);
      await loadQuizzes();
    } catch (error) {
      setNotice({
        type: "error",
        message: error.message || "Failed to submit quiz.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const allAnswered =
    activeQuiz?.questions?.every((question) => answers[question.id]) || false;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Online Exam</h1>
          <p className="mt-1 text-gray-600">
            Answer available MCQ quizzes during the scheduled lab time.
          </p>
        </div>
        <Button variant="secondary" onClick={loadQuizzes} disabled={loading}>
          <RefreshCw className={`mr-2 inline h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {notice.message && (
        <p
          className={`rounded-lg px-4 py-3 text-sm ${
            notice.type === "success"
              ? "border border-green-100 bg-green-50 text-green-800"
              : "border border-red-100 bg-red-50 text-red-800"
          }`}
        >
          {notice.message}
        </p>
      )}

      {!activeQuiz ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {quizzes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-16 text-center lg:col-span-2">
              <Clock className="mx-auto mb-3 h-12 w-12 text-gray-400" />
              <p className="text-gray-600">No quiz is published for your class yet.</p>
            </div>
          ) : (
            quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {quiz.subjectCode ? `${quiz.subjectCode} - ` : ""}
                      {quiz.subjectName}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {quiz.teacherName || "Teacher"} - {quiz.marks} marks
                    </p>
                  </div>
                  {quiz.hasSubmitted && (
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
                  )}
                </div>

                <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  <p>Opens: {quiz.availableFrom || "Not set"}</p>
                  <p>Closes: {quiz.availableUntil || "Not set"}</p>
                </div>

                {quiz.hasSubmitted ? (
                  <p className="mt-4 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
                    Submitted - Score {quiz.score}/{quiz.marks}
                  </p>
                ) : (
                  <Button
                    className="mt-4 w-full"
                    onClick={() => openQuiz(quiz.id)}
                    disabled={!quiz.isOpen || loading}
                  >
                    {quiz.isOpen
                      ? "Start quiz"
                      : quiz.displayStatus === "closed"
                        ? "Closed"
                        : "Not open yet"}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {activeQuiz.subjectName}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Submit once. You cannot edit answers after submission.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setActiveQuiz(null)}>
              Back to list
            </Button>
          </div>

          <div className="mt-6 space-y-5">
            {activeQuiz.questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <h3 className="font-bold text-gray-900">
                  {index + 1}. {question.questionText}
                </h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {question.options.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: option.label,
                        }))
                      }
                      className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${
                        answers[question.id] === option.label
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-gray-200 bg-white text-gray-700 hover:border-blue-200"
                      }`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-gray-100 text-xs font-bold">
                        {option.label}
                      </span>
                      <span>{option.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={submitQuiz} disabled={submitting || !allAnswered}>
              {submitting ? "Submitting" : "Submit answers"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
