import { useParams, useNavigate, type NavigateFunction } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { usePet } from "../context/PetContext";
import type {
  MatchingModule as MatchingModuleType,
  ModuleContent,
  MultipleChoiceModule,
  LeveledModule as LeveledModuleType,
  LevelQuestion,
} from "../data/mock/modules";
import { mockModules } from "../data/mock/modules";
import { api } from "../api/api";

const OPTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function ModulePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setCoinsDirect } = usePet();

  const moduleId = Number(id);
  const moduleData = useMemo<ModuleContent | undefined>(() => {
    if (!Number.isFinite(moduleId)) {
      return undefined;
    }
    return mockModules.find((module) => module.id === moduleId);
  }, [moduleId]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (moduleData?.type === "multiple-choice") {
      setCurrentIndex(0);
      setSelectedIndex(null);
      setFeedback(null);
      setCompleted(false);
    }
  }, [moduleData?.id, moduleData?.type]);

  useEffect(() => {
    if (moduleData?.type === "multiple-choice") {
      setSelectedIndex(null);
      setFeedback(null);
    }
  }, [currentIndex, moduleData?.type]);

  if (!moduleData) {
    return (
      <div
        className="relative flex h-screen w-screen items-center justify-center bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/module-background.png')",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/map")}
          className="absolute top-4 left-4 bg-white/80 hover:bg-white text-gray-800 border border-gray-200 shadow-sm rounded-lg px-3 py-1.5 transition"
        >
          ← Back to Map
        </button>
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-lg text-center">
          <h1 className="text-2xl font-bold text-gray-800">Module not found</h1>
          <p className="mt-2 text-gray-600">We couldn&apos;t find the module you&apos;re looking for.</p>
          <button
            type="button"
            onClick={() => navigate("/map")}
            className="mt-6 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-4 py-2 rounded-lg transition"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  if (moduleData.type === "leveled") {
    return (
      <LeveledModuleView moduleId={id ?? ""} module={moduleData} navigate={navigate} />
    );
  }

  if (moduleData.type === "matching") {
    return (
      <MatchingModuleView moduleId={id ?? ""} module={moduleData} navigate={navigate} />
    );
  }

  const module = moduleData as MultipleChoiceModule;
  const question = module.questions[currentIndex];
  const totalQuestions = module.questions.length;
  const optionLetters = OPTION_LETTERS;

  const chooseOption = (i: number) => {
    if (feedback || completed) return;
    setSelectedIndex(i);
    const isCorrect = i === question.answerIndex;
    api.post("/api/progress/record", {
      moduleId: id ?? "mock",
      questionIndex: currentIndex,
      correct: isCorrect,
    }).catch(() => { });

    if (isCorrect) {
      setFeedback("correct");
    } else {
      setFeedback("incorrect");
    }
  };

  const nextStep = () => {
    if (feedback !== "correct") return;
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((idx) => idx + 1);
      setFeedback(null);
    } else {
      setCompleted(true);
      api.post("/api/progress/complete", { moduleId: id ?? "mock" }).then(res => {
        if (res.data?.coins != null) {
          setCoinsDirect(res.data.coins);
        }
      }).catch(() => { });
    }
  };

  return (
    <div
      className="relative w-screen h-screen overflow-y-auto"
      style={{
        backgroundImage: "url('/module-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
        backgroundRepeat: "no-repeat",
      }}
    >
      <button
        type="button"
        onClick={() => navigate("/map")}
        className="absolute top-4 left-4 bg-white/80 hover:bg-white text-gray-800 border border-gray-200 shadow-sm rounded-lg px-3 py-1.5 transition"
      >
        ← Back to Map
      </button>

      {/* Title + Question */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow p-4 sm:p-6 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            Module {id} · {module.title}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Question {currentIndex + 1} of {totalQuestions}
          </p>
          <p className="mt-2 text-base sm:text-lg text-gray-700">{question.prompt}</p>
        </div>
      </div>

      {/* Options */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {question.options.map((opt, i) => {
            const label = optionLetters[i] ?? `${i + 1}`;
            return (
              <button
                key={i}
                type="button"
                onClick={() => chooseOption(i)}
                className={`flex items-center gap-3 text-left bg-white/90 hover:bg-white border border-gray-200 rounded-2xl shadow-md px-4 py-4 sm:py-5 transition ${selectedIndex === i ? "ring-4 ring-yellow-300" : ""
                  }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-gray-900 font-extrabold">
                  {label}
                </span>
                <span className="text-gray-800 font-medium">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Modal */}
      {feedback && !completed && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-[90%] max-w-md text-center">
            {feedback === "incorrect" ? (
              <>
                <h2 className="text-2xl font-bold text-red-600">Incorrect</h2>
                <p className="mt-2 text-gray-700">Try again!</p>
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setSelectedIndex(null);
                  }}
                  className="mt-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-4 py-2 rounded-lg transition"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-green-600">Correct!</h2>
                <p className="mt-2 text-gray-700">
                  {currentIndex + 1 < totalQuestions
                    ? "Nice job — let's go to the next question."
                    : "Great work — you completed this module!"}
                </p>
                <button
                  type="button"
                  onClick={nextStep}
                  className="mt-4 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-4 py-2 rounded-lg transition"
                >
                  {currentIndex + 1 < totalQuestions ? "Next question" : "Finish"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Completion Screen */}
      {completed && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-[90%] max-w-md text-center">
            <h2 className="text-3xl font-extrabold text-emerald-600">Module Complete!</h2>
            <p className="mt-3 text-gray-700">
              Congratulations — you have finished Module {id}.
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => navigate("/map")}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-5 py-2 rounded-lg transition"
              >
                Back to Map
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(0);
                  setCompleted(false);
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-5 py-2 rounded-lg transition"
              >
                Retry Module
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type LeveledModuleProps = {
  moduleId: string;
  module: LeveledModuleType;
  navigate: NavigateFunction;
};

function LeveledModuleView({ moduleId, module, navigate }: LeveledModuleProps) {
  const [activeLevelId, setActiveLevelId] = useState<string | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<string[]>(() =>
    module.levels.length > 0 ? [module.levels[0].id] : []
  );
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [matchingAssignments, setMatchingAssignments] = useState<Record<string, string | null>>({});
  const [matchingValidation, setMatchingValidation] = useState<Record<string, boolean | null>>({});
  const [matchingOrder, setMatchingOrder] = useState<string[]>([]);
  const [matchingDraggingId, setMatchingDraggingId] = useState<string | null>(null);
  const [matchingMessage, setMatchingMessage] = useState<string | null>(null);
  const [shortAnswerInput, setShortAnswerInput] = useState("");
  const { setCoinsDirect } = usePet();

  const resetQuestionState = useCallback((question?: LevelQuestion) => {
    setFeedback(null);
    setSelectedIndex(null);
    setMatchingMessage(null);
    setMatchingDraggingId(null);
    if (question && question.type === "matching") {
      setMatchingAssignments(createEmptyAssignmentsFromPairs(question.pairs));
      setMatchingValidation(createEmptyValidationFromPairs(question.pairs));
      setMatchingOrder(shuffle(question.pairs.map((pair) => pair.id)));
    } else {
      setMatchingAssignments({});
      setMatchingValidation({});
      setMatchingOrder([]);
    }
    setShortAnswerInput("");
  }, []);

  useEffect(() => {
    setActiveLevelId(null);
    setUnlockedIds(module.levels.length > 0 ? [module.levels[0].id] : []);
    setCompletedIds([]);
    setCelebrate(false);
    resetQuestionState();
  }, [module.id, module.levels, resetQuestionState]);

  useEffect(() => {
    const current = module.levels.find((level) => level.id === activeLevelId);
    resetQuestionState(current?.question);
  }, [activeLevelId, module.levels, resetQuestionState]);

  const activeLevel = useMemo(
    () => module.levels.find((level) => level.id === activeLevelId) ?? null,
    [module.levels, activeLevelId]
  );
  const activeQuestion = activeLevel?.question;
  const multipleChoiceQuestion =
    activeQuestion && activeQuestion.type === "multiple-choice" ? activeQuestion : null;
  const matchingQuestion =
    activeQuestion && activeQuestion.type === "matching" ? activeQuestion : null;
  const shortAnswerQuestion =
    activeQuestion && activeQuestion.type === "short-answer" ? activeQuestion : null;
  const optionLetters = OPTION_LETTERS;

  const matchingOptionLabels = useMemo(() => {
    if (!matchingQuestion) return {};
    return matchingQuestion.pairs.reduce<Record<string, string>>((acc, pair) => {
      acc[pair.id] = pair.match;
      return acc;
    }, {});
  }, [matchingQuestion]);

  const matchingAvailableOptionIds = useMemo(() => {
    if (!matchingQuestion) return [];
    const usedIds = new Set(
      Object.values(matchingAssignments).filter((value): value is string => Boolean(value))
    );
    return matchingOrder.filter((optionId) => !usedIds.has(optionId));
  }, [matchingAssignments, matchingOrder, matchingQuestion]);

  const isUnlocked = (levelId: string) => unlockedIds.includes(levelId);
  const isCompleted = (levelId: string) => completedIds.includes(levelId);

  const handleOpenLevel = (levelId: string) => {
    if (!isUnlocked(levelId)) return;
    setActiveLevelId(levelId);
  };

  const handleOptionSelect = (index: number) => {
    if (!multipleChoiceQuestion || feedback === "correct") return;
    setSelectedIndex(index);
    if (index === multipleChoiceQuestion.answerIndex) {
      setFeedback("correct");
    } else {
      setFeedback("incorrect");
    }
  };

  const allowDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!matchingQuestion) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDragStart = (event: ReactDragEvent<HTMLDivElement>, optionId: string) => {
    if (!matchingQuestion) return;
    event.dataTransfer.setData("text/plain", optionId);
    event.dataTransfer.effectAllowed = "move";
    setMatchingDraggingId(optionId);
    setMatchingMessage(null);
  };

  const handleDragEnd = () => {
    setMatchingDraggingId(null);
  };

  const handleDrop = (event: ReactDragEvent<HTMLDivElement>, targetId: string) => {
    if (!matchingQuestion) return;
    event.preventDefault();
    const optionId = matchingDraggingId ?? event.dataTransfer.getData("text/plain");
    if (!optionId) {
      return;
    }
    setMatchingAssignments((prev) => {
      const next: Record<string, string | null> = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === optionId) {
          next[key] = null;
        }
      });
      next[targetId] = optionId;
      return next;
    });
    setMatchingValidation(createEmptyValidationFromPairs(matchingQuestion.pairs));
    setMatchingMessage(null);
    setMatchingDraggingId(null);
    setFeedback(null);
  };

  const handlePoolDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!matchingQuestion) return;
    event.preventDefault();
    const optionId = matchingDraggingId ?? event.dataTransfer.getData("text/plain");
    if (!optionId) {
      return;
    }
    setMatchingAssignments((prev) => {
      if (!Object.values(prev).includes(optionId)) {
        return prev;
      }
      const next: Record<string, string | null> = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === optionId) {
          next[key] = null;
        }
      });
      return next;
    });
    setMatchingValidation(createEmptyValidationFromPairs(matchingQuestion.pairs));
    setMatchingMessage(null);
    setMatchingDraggingId(null);
    setFeedback(null);
  };

  const removeMatchingAssignment = (targetId: string) => {
    if (!matchingQuestion) return;
    setMatchingAssignments((prev) => ({ ...prev, [targetId]: null }));
    setMatchingValidation((prev) => ({ ...prev, [targetId]: null }));
    setMatchingMessage(null);
    setFeedback(null);
  };

  const checkMatchingAnswer = () => {
    if (!matchingQuestion) return;
    const allAssigned = matchingQuestion.pairs.every((pair) => matchingAssignments[pair.id]);
    if (!allAssigned) {
      setMatchingMessage("Place a card in each focus area before checking.");
      setFeedback(null);
      setMatchingValidation(createEmptyValidationFromPairs(matchingQuestion.pairs));
      return;
    }

    const evaluation = matchingQuestion.pairs.reduce<Record<string, boolean | null>>((acc, pair) => {
      acc[pair.id] = matchingAssignments[pair.id] === pair.id;
      return acc;
    }, {});

    setMatchingValidation(evaluation);
    const allCorrect = Object.values(evaluation).every((value) => value === true);

    if (allCorrect) {
      setMatchingMessage("Perfect alignment! Coach Ember is impressed.");
      setFeedback("correct");
      api.post("/api/progress/record", {
        moduleId,
        questionIndex: 0,
        correct: true,
      }).catch(() => { });
    } else {
      setMatchingMessage("Adjust the red-highlighted spots and try again.");
      setFeedback("incorrect");
      api.post("/api/progress/record", {
        moduleId,
        questionIndex: 0,
        correct: false,
      }).catch(() => { });
    }
  };

  const evaluateShortAnswer = () => {
    if (!shortAnswerQuestion) return;
    const normalized = shortAnswerInput.trim().toLowerCase();
    if (!normalized) {
      setFeedback(null);
      return;
    }
    const isCorrect = shortAnswerQuestion.acceptableAnswers.some(
      (answer) => normalized === answer.toLowerCase()
    );
    setFeedback(isCorrect ? "correct" : "incorrect");
    api.post("/api/progress/record", {
      moduleId,
      questionIndex: 0,
      correct: isCorrect,
    }).catch(() => { });
  };

  const handleResetAttempt = () => {
    resetQuestionState(activeQuestion);
  };

  const closeQuestion = () => {
    resetQuestionState(activeQuestion);
    setActiveLevelId(null);
  };

  const handleContinue = () => {
    if (!activeLevel) return;
    setCompletedIds((prev) => {
      if (prev.includes(activeLevel.id)) return prev;
      return [...prev, activeLevel.id];
    });

    const currentIndex = module.levels.findIndex((level) => level.id === activeLevel.id);
    const nextLevel = module.levels[currentIndex + 1];

    if (nextLevel) {
      setUnlockedIds((prev) => (prev.includes(nextLevel.id) ? prev : [...prev, nextLevel.id]));
    } else {
      setCelebrate(true);
      api.post("/api/progress/complete", { moduleId }).then(res => {
        if (res.data?.coins != null) {
          setCoinsDirect(res.data.coins);
        }
      }).catch(() => { });
    }

    closeQuestion();
  };

  const resetMission = () => {
    setUnlockedIds(module.levels.length > 0 ? [module.levels[0].id] : []);
    setCompletedIds([]);
    setActiveLevelId(null);
    resetQuestionState();
    setCelebrate(false);
  };

  const incorrectCopy =
    activeQuestion?.type === "short-answer"
      ? "Not quite—double-check your wording and try again."
      : activeQuestion?.type === "matching"
        ? "Some matches still need work. Adjust them and give it another shot."
        : "Not quite there—try another choice.";

  const correctCopy =
    module.levels.findIndex((level) => level.id === activeLevel?.id) === module.levels.length - 1
      ? "Brilliant finish! You’ve cleared the final level."
      : "Great job! The next coach is ready for you.";

  return (
    <div
      className="relative w-screen min-h-screen overflow-y-auto"
      style={{
        backgroundImage: "url('/module-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
        backgroundRepeat: "no-repeat",
      }}
    >
      <button
        type="button"
        onClick={() => navigate("/map")}
        className="absolute top-4 left-4 bg-white/80 hover:bg-white text-gray-800 border border-gray-200 shadow-sm rounded-lg px-3 py-1.5 transition"
      >
        ← Back to Map
      </button>

      <div className="mx-auto w-full max-w-5xl px-4 pt-24 pb-16">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow p-4 sm:p-6 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            Module {moduleId} · {module.title}
          </h1>
          {module.intro && <p className="mt-2 text-sm sm:text-base text-gray-700">{module.intro}</p>}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {module.levels.map((level, idx) => {
            const unlocked = isUnlocked(level.id);
            const completed = isCompleted(level.id);
            const active = activeLevelId === level.id;
            const statusLabel = completed
              ? "Completed"
              : unlocked
                ? "Tap to start"
                : "Locked";
            const badgeClass = completed ? "bg-emerald-500" : level.accentColor ?? "bg-slate-400";
            const cardBase =
              "relative flex flex-col items-center gap-3 rounded-2xl border p-4 text-center shadow transition";
            const cardState = completed
              ? "border-emerald-400 bg-emerald-50"
              : unlocked
                ? "border-yellow-300 bg-white/90 hover:-translate-y-1 hover:shadow-lg"
                : "border-gray-200 bg-white/60";
            const cardCursor = unlocked ? "cursor-pointer" : "cursor-not-allowed opacity-60";

            return (
              <button
                key={level.id}
                type="button"
                onClick={() => handleOpenLevel(level.id)}
                disabled={!unlocked}
                className={`${cardBase} ${cardState} ${cardCursor} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400`}
              >
                <span
                  className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl text-white shadow-inner ${badgeClass}`}
                >
                  {level.avatar ?? idx + 1}
                </span>
                <div>
                  <p className="text-base font-semibold text-gray-800">{level.name}</p>
                  {level.description && (
                    <p className="mt-1 text-sm text-gray-600">{level.description}</p>
                  )}
                </div>
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${completed ? "text-emerald-600" : unlocked ? "text-yellow-600" : "text-gray-400"
                    }`}
                >
                  {statusLabel}
                </span>
                {active && <span className="sr-only">Current level question open</span>}
              </button>
            );
          })}
        </div>
      </div>

      {activeLevel && activeQuestion && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white ${activeLevel.accentColor ?? "bg-slate-400"}`}
              >
                {activeLevel.avatar ?? "🙂"}
              </span>
              <div>
                <p className="text-lg font-semibold text-gray-800">{activeLevel.name}</p>
                {activeLevel.description && (
                  <p className="text-sm text-gray-600">{activeLevel.description}</p>
                )}
              </div>
            </div>

            <p className="mt-4 text-base font-medium text-gray-800 sm:text-lg">
              {activeQuestion.prompt}
            </p>

            {multipleChoiceQuestion && (
              <div className="mt-4 space-y-3">
                {multipleChoiceQuestion.options.map((option, index) => {
                  const letter = optionLetters[index] ?? `${index + 1}`;
                  const isChosen = selectedIndex === index;
                  const isCorrectChoice =
                    feedback === "correct" &&
                    isChosen &&
                    index === multipleChoiceQuestion.answerIndex;
                  const isIncorrectChoice =
                    feedback === "incorrect" &&
                    isChosen &&
                    index !== multipleChoiceQuestion.answerIndex;

                  let optionState =
                    "border-gray-200 bg-white hover:bg-yellow-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400";
                  if (isCorrectChoice) {
                    optionState = "border-emerald-400 bg-emerald-50";
                  } else if (isIncorrectChoice) {
                    optionState = "border-rose-300 bg-rose-50";
                  } else if (isChosen) {
                    optionState = "border-yellow-300 bg-yellow-50";
                  }

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleOptionSelect(index)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${optionState}`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 font-bold text-gray-900">
                        {letter}
                      </span>
                      <span className="text-sm font-medium text-gray-800 sm:text-base">{option}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {matchingQuestion && (
              <div className="mt-4 space-y-4">
                {matchingQuestion.instructions && (
                  <p className="text-sm text-gray-600">{matchingQuestion.instructions}</p>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    {matchingQuestion.pairs.map((pair) => {
                      const assignedOptionId = matchingAssignments[pair.id];
                      const validationState = matchingValidation[pair.id];

                      let dropStateClasses = "border-gray-300 bg-white/60";
                      if (validationState === true) {
                        dropStateClasses = "border-emerald-400 bg-emerald-50";
                      } else if (validationState === false) {
                        dropStateClasses = "border-rose-400 bg-rose-50";
                      } else if (matchingDraggingId) {
                        dropStateClasses = "border-yellow-300 bg-yellow-50";
                      }

                      return (
                        <div
                          key={pair.id}
                          className="rounded-2xl border border-gray-200 bg-white/85 p-3 shadow-sm"
                        >
                          <p className="text-sm font-semibold text-gray-800 sm:text-base">
                            {pair.prompt}
                          </p>
                          <div
                            className={`mt-2 flex min-h-[70px] items-center justify-between gap-2 rounded-xl border-2 border-dashed px-3 py-3 transition ${dropStateClasses}`}
                            onDragOver={allowDrop}
                            onDrop={(event) => handleDrop(event, pair.id)}
                          >
                            {assignedOptionId ? (
                              <div
                                draggable
                                onDragStart={(event) => handleDragStart(event, assignedOptionId)}
                                onDragEnd={handleDragEnd}
                                className="flex w-full items-center justify-between gap-2 rounded-lg border border-transparent bg-yellow-200 px-3 py-2 text-left text-gray-900 shadow-sm cursor-grab active:cursor-grabbing"
                              >
                                <span className="text-sm font-medium leading-snug sm:text-base">
                                  {matchingOptionLabels[assignedOptionId]}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeMatchingAssignment(pair.id)}
                                  className="text-lg leading-none text-gray-600 hover:text-gray-900"
                                  aria-label="Remove match"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 sm:text-sm">
                                Drag the matching habit here
                              </span>
                            )}
                          </div>
                          {validationState === false && (
                            <p className="mt-2 text-xs text-rose-500 sm:text-sm">
                              Re-check this pairing before continuing.
                            </p>
                          )}
                          {validationState === true && (
                            <p className="mt-2 text-xs text-emerald-600 sm:text-sm">Great match!</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className="rounded-2xl border border-gray-200 bg-white/85 p-3 shadow-sm"
                    onDragOver={allowDrop}
                    onDrop={handlePoolDrop}
                  >
                    <h3 className="text-sm font-semibold text-gray-800 sm:text-base">Habit Cards</h3>
                    <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                      Drag a card to the focus area it supports. Need a change? Drop it back here.
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      {matchingAvailableOptionIds.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-gray-300 bg-white/60 px-3 py-4 text-center text-xs text-gray-400 sm:text-sm">
                          All cards are currently placed. Adjust a match on the left to move one back.
                        </p>
                      ) : (
                        matchingAvailableOptionIds.map((optionId) => (
                          <div
                            key={optionId}
                            draggable
                            onDragStart={(event) => handleDragStart(event, optionId)}
                            onDragEnd={handleDragEnd}
                            className="cursor-grab active:cursor-grabbing rounded-xl border border-yellow-300 bg-yellow-100 px-4 py-3 text-gray-800 shadow-sm transition hover:-translate-y-0.5"
                          >
                            <span className="text-sm font-medium leading-snug sm:text-base">
                              {matchingOptionLabels[optionId]}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={checkMatchingAnswer}
                    className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-yellow-500"
                  >
                    Check matches
                  </button>
                  <button
                    type="button"
                    onClick={() => resetQuestionState(matchingQuestion)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    Reset matches
                  </button>
                  {matchingMessage && (
                    <p
                      className={`text-sm font-medium ${feedback === "correct"
                        ? "text-emerald-600"
                        : feedback === "incorrect"
                          ? "text-rose-600"
                          : "text-amber-600"
                        }`}
                    >
                      {matchingMessage}
                    </p>
                  )}
                </div>
              </div>
            )}

            {shortAnswerQuestion && (
              <div className="mt-5 space-y-3">
                <input
                  type="text"
                  value={shortAnswerInput}
                  onChange={(event) => {
                    setShortAnswerInput(event.target.value);
                    if (feedback === "incorrect") {
                      setFeedback(null);
                    }
                  }}
                  placeholder={shortAnswerQuestion.placeholder ?? "Enter your answer"}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 shadow-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-200 sm:text-base"
                  readOnly={feedback === "correct"}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={evaluateShortAnswer}
                    className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:bg-yellow-200"
                    disabled={shortAnswerInput.trim().length === 0 || feedback === "correct"}
                  >
                    Check answer
                  </button>
                  {shortAnswerQuestion.hint && (
                    <p className="text-xs text-gray-500 sm:text-sm">
                      Hint: {shortAnswerQuestion.hint}
                    </p>
                  )}
                </div>
              </div>
            )}

            {feedback === "incorrect" && (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {incorrectCopy}
                <button
                  type="button"
                  onClick={handleResetAttempt}
                  className="ml-3 inline-flex items-center text-rose-700 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {feedback === "correct" && (
              <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {correctCopy}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={closeQuestion}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Back to level select
              </button>
              {feedback === "correct" ? (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-yellow-500"
                >
                  {module.levels.findIndex((level) => level.id === activeLevel.id) ===
                    module.levels.length - 1
                    ? "Finish mission"
                    : "Unlock next level"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {celebrate && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 px-4 py-8">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-extrabold text-emerald-600">Mission Complete!</h2>
            <p className="mt-3 text-gray-700">
              {module.outro ?? "You mastered every movement benefit. Keep the momentum going!"}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/map")}
                className="rounded-lg bg-yellow-400 px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-yellow-500"
              >
                Back to Map
              </button>
              <button
                type="button"
                onClick={resetMission}
                className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Replay levels
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type MatchingModuleProps = {
  moduleId: string;
  module: MatchingModuleType;
  navigate: NavigateFunction;
};

type MatchingMessage =
  | { status: "incomplete"; text: string }
  | { status: "incorrect"; text: string }
  | { status: "correct"; text: string }
  | null;

function MatchingModuleView({ moduleId, module, navigate }: MatchingModuleProps) {
  const [assignments, setAssignments] = useState<Record<string, string | null>>(() =>
    createEmptyAssignmentsFromPairs(module.pairs)
  );
  const [validation, setValidation] = useState<Record<string, boolean | null>>(() =>
    createEmptyValidationFromPairs(module.pairs)
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [message, setMessage] = useState<MatchingMessage>(null);
  const [completed, setCompleted] = useState(false);
  const [shuffledOptionIds, setShuffledOptionIds] = useState<string[]>(() =>
    shuffle(module.pairs.map((pair) => pair.id))
  );
  const { setCoinsDirect } = usePet();

  const optionLabels = useMemo(() => {
    return module.pairs.reduce<Record<string, string>>((acc, pair) => {
      acc[pair.id] = pair.match;
      return acc;
    }, {});
  }, [module.id]);

  useEffect(() => {
    setAssignments(createEmptyAssignmentsFromPairs(module.pairs));
    setValidation(createEmptyValidationFromPairs(module.pairs));
    setMessage(null);
    setCompleted(false);
    setShuffledOptionIds(shuffle(module.pairs.map((pair) => pair.id)));
    setDraggingId(null);
  }, [module.id, module.pairs]);

  const availableOptionIds = useMemo(() => {
    const usedIds = new Set(
      Object.values(assignments).filter((value): value is string => Boolean(value))
    );
    return shuffledOptionIds.filter((optionId) => !usedIds.has(optionId));
  }, [assignments, shuffledOptionIds]);

  const allowDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDragStart = (event: ReactDragEvent<HTMLDivElement>, optionId: string) => {
    event.dataTransfer.setData("text/plain", optionId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(optionId);
    setMessage(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDrop = (event: ReactDragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    const optionId = draggingId ?? event.dataTransfer.getData("text/plain");
    if (!optionId) {
      return;
    }
    setAssignments((prev) => {
      const next: Record<string, string | null> = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === optionId) {
          next[key] = null;
        }
      });
      next[targetId] = optionId;
      return next;
    });
    setValidation(createEmptyValidationFromPairs(module.pairs));
    setMessage(null);
    setDraggingId(null);
  };

  const handlePoolDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const optionId = draggingId ?? event.dataTransfer.getData("text/plain");
    if (!optionId) {
      return;
    }
    setAssignments((prev) => {
      if (!Object.values(prev).includes(optionId)) {
        return prev;
      }
      const next: Record<string, string | null> = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === optionId) {
          next[key] = null;
        }
      });
      return next;
    });
    setValidation(createEmptyValidationFromPairs(module.pairs));
    setMessage(null);
    setDraggingId(null);
  };

  const unassign = (targetId: string) => {
    setAssignments((prev) => {
      if (!prev[targetId]) return prev;
      return { ...prev, [targetId]: null };
    });
    setValidation(createEmptyValidationFromPairs(module.pairs));
    setMessage(null);
  };

  const resetAll = () => {
    setAssignments(createEmptyAssignmentsFromPairs(module.pairs));
    setValidation(createEmptyValidationFromPairs(module.pairs));
    setMessage(null);
    setCompleted(false);
    setShuffledOptionIds(shuffle(module.pairs.map((pair) => pair.id)));
  };

  const checkMatches = () => {
    const allAssigned = module.pairs.every((pair) => assignments[pair.id]);
    if (!allAssigned) {
      setMessage({
        status: "incomplete",
        text: "Fill every match before checking answers.",
      });
      setValidation(createEmptyValidationFromPairs(module.pairs));
      return;
    }

    const evaluation = module.pairs.reduce<Record<string, boolean | null>>((acc, pair) => {
      acc[pair.id] = assignments[pair.id] === pair.id;
      return acc;
    }, {});

    setValidation(evaluation);
    const allCorrect = Object.values(evaluation).every((value) => value === true);

    if (allCorrect) {
      setMessage({ status: "correct", text: "Perfect match! Fantastic job! 🎉" });
      setCompleted(true);
      api.post("/api/progress/complete", { moduleId }).then(res => {
        if (res.data?.coins != null) {
          setCoinsDirect(res.data.coins);
        }
      }).catch(() => { });
    } else {
      setMessage({
        status: "incorrect",
        text: "Some matches are incorrect. Follow the red hints and try again.",
      });
    }
  };

  const messageColor =
    message?.status === "correct"
      ? "text-emerald-600"
      : message?.status === "incorrect"
        ? "text-rose-600"
        : "text-amber-600";

  return (
    <div
      className="relative w-screen min-h-screen overflow-y-auto px-4 py-16"
      style={{
        backgroundImage: "url('/module-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
        backgroundRepeat: "no-repeat",
      }}
    >
      <button
        type="button"
        onClick={() => navigate("/map")}
        className="absolute top-4 left-4 bg-white/80 hover:bg-white text-gray-800 border border-gray-200 shadow-sm rounded-lg px-3 py-1.5 transition"
      >
        ← Back to Map
      </button>

      {/* Title + Instructions */}
      <div className="mx-auto w-full max-w-4xl">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow p-3 sm:p-5 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            Module {moduleId} · {module.title}
          </h1>
          {module.description && (
            <p className="mt-2 text-sm sm:text-base text-gray-700">{module.description}</p>
          )}
          {module.instructions && (
            <p className="mt-2 text-sm text-amber-700">{module.instructions}</p>
          )}
        </div>
      </div>

      {/* Drag + Match Workspace */}
      <div className="mx-auto mt-8 w-full max-w-5xl">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="bg-white/80 backdrop-blur rounded-2xl p-3 sm:p-5 shadow-lg border border-gray-200">
            <h2 className="text-base font-semibold text-gray-800 sm:text-lg">Movement Categories</h2>
            <p className="mt-1 text-sm text-gray-600">
              Each category has a matching benefit. Drag the correct card from the right to complete the match.
            </p>
            <div className="mt-4 space-y-4">
              {module.pairs.map((pair) => {
                const assignedOptionId = assignments[pair.id];
                const validationState = validation[pair.id];

                let dropStateClasses = "border-gray-300 bg-white/60";
                if (validationState === true) {
                  dropStateClasses = "border-emerald-400 bg-emerald-50";
                } else if (validationState === false) {
                  dropStateClasses = "border-rose-400 bg-rose-50";
                } else if (draggingId) {
                  dropStateClasses = "border-yellow-300 bg-yellow-50";
                }

                return (
                  <div
                    key={pair.id}
                    className="rounded-2xl border border-gray-200 bg-white/85 p-3 shadow-sm sm:p-4"
                  >
                    <p className="text-base font-semibold text-gray-800">{pair.prompt}</p>
                    <div
                      className={`mt-3 flex min-h-[72px] items-center justify-between gap-2 rounded-xl border-2 border-dashed px-3 py-3 transition ${dropStateClasses}`}
                      onDragOver={allowDrop}
                      onDrop={(event) => handleDrop(event, pair.id)}
                    >
                      {assignedOptionId ? (
                        <div
                          draggable
                          onDragStart={(event) => handleDragStart(event, assignedOptionId)}
                          onDragEnd={handleDragEnd}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-transparent bg-yellow-200 px-3 py-2 text-left text-gray-900 shadow-sm cursor-grab active:cursor-grabbing"
                        >
                          <span className="font-medium leading-snug">
                            {optionLabels[assignedOptionId]}
                          </span>
                          <button
                            type="button"
                            onClick={() => unassign(pair.id)}
                            className="text-lg leading-none text-gray-600 hover:text-gray-900"
                            aria-label="Remove match"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Drag the best-fit card here</span>
                      )}
                    </div>
                    {validationState === false && (
                      <p className="mt-2 text-sm text-rose-500">Not quite right yet—adjust this match.</p>
                    )}
                    {validationState === true && (
                      <p className="mt-2 text-sm text-emerald-600">Match confirmed!</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="bg-white/80 backdrop-blur rounded-2xl p-3 sm:p-5 shadow-lg border border-gray-200"
            onDragOver={allowDrop}
            onDrop={handlePoolDrop}
          >
            <h2 className="text-base font-semibold text-gray-800 sm:text-lg">Benefit Cards</h2>
            <p className="mt-1 text-sm text-gray-600">
              Drag these cards to the matching category on the left. Need to change it? Drop the card back here.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3">
              {availableOptionIds.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 bg-white/60 px-3 py-5 text-center text-sm text-gray-400">
                  Every card has already been placed on the left.
                </p>
              ) : (
                availableOptionIds.map((optionId) => (
                  <div
                    key={optionId}
                    draggable
                    onDragStart={(event) => handleDragStart(event, optionId)}
                    onDragEnd={handleDragEnd}
                    className="cursor-grab active:cursor-grabbing rounded-xl border border-yellow-300 bg-yellow-100 px-4 py-3 text-gray-800 shadow-sm transition hover:-translate-y-0.5"
                  >
                    <span className="font-medium leading-snug">{optionLabels[optionId]}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={checkMatches}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-5 py-2 rounded-lg transition"
          >
            Check answers
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-5 py-2 rounded-lg transition"
          >
            Reset
          </button>
          {message && (
            <p className={`text-sm font-medium ${messageColor}`}>{message.text}</p>
          )}
        </div>
      </div>

      {/* Completion Screen */}
      {completed && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-[90%] max-w-md text-center">
            <h2 className="text-3xl font-extrabold text-emerald-600">Matching Complete!</h2>
            <p className="mt-3 text-gray-700">
              Congrats on finishing Module {moduleId}! You now know the key benefits for each movement style.
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => navigate("/map")}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-5 py-2 rounded-lg transition"
              >
                Back to Map
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium px-5 py-2 rounded-lg transition"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function createEmptyAssignmentsFromPairs(
  pairs: Array<{ id: string }>
): Record<string, string | null> {
  return pairs.reduce<Record<string, string | null>>((acc, pair) => {
    acc[pair.id] = null;
    return acc;
  }, {});
}

function createEmptyValidationFromPairs(
  pairs: Array<{ id: string }>
): Record<string, boolean | null> {
  return pairs.reduce<Record<string, boolean | null>>((acc, pair) => {
    acc[pair.id] = null;
    return acc;
  }, {});
}

function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
