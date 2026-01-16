import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePet } from '../context/PetContext';
import { fetchModuleLevels, fetchLevelDialogue, fetchQuestion } from '../context/moduleContext';
import { api } from '../api/api';

// --- Types ---
type LevelSummary = {
    _id: string;
    levelID: string;
    coins: number;
    questionID: string;
    name: string;
};

type DialogueItem = {
    text: string;
    name: string;
    events?: any[];
};

type GroupData = {
    groupName: string;
    items: string[];
};

type QuestionData = {
    _id: string;
    questionID: string;
    problem: string;
    type: 'select' | 'classification' | 'writing' | string;
    options: string[];
    answer?: string | string[];
    wrongText?: string[];
    tip?: string;
    groups?: GroupData[];
};

export default function ModulePageGame() {
    const { id } = useParams<{ id: string }>();
    const moduleId = id ?? '1';
    const navigate = useNavigate();
    const { pet } = usePet();

    // --- State ---
    const [levels, setLevels] = useState<LevelSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [finishedLevels, setFinishedLevels] = useState<Set<number>>(new Set());

    // Stats Tracking (Module Level)
    const moduleStartTimeRef = useRef<number>(Date.now());
    const [totalMistakes, setTotalMistakes] = useState(0);
    const [sessionCoins, setSessionCoins] = useState(0);
    const [showModuleSummary, setShowModuleSummary] = useState(false);

    // Stats Tracking (Question Level)
    const questionStartTimeRef = useRef<number>(0);
    const [currentQuestionMistakes, setCurrentQuestionMistakes] = useState(0);
    const [currentReward, setCurrentReward] = useState(0);

    // Player
    const playerRef = useRef({ x: 60 });
    const [playerX, setPlayerX] = useState(60);
    const [autoMove, setAutoMove] = useState(true);
    const [currentLevelIndex, setCurrentLevelIndex] = useState<number | null>(null);

    // Interaction
    const [dialogueQueue, setDialogueQueue] = useState<DialogueItem[] | null>(null);
    const [dialogueIndex, setDialogueIndex] = useState(0);
    const [question, setQuestion] = useState<QuestionData | null>(null);

    // Question Logic
    const [userAnswer, setUserAnswer] = useState('');
    const [classificationState, setClassificationState] = useState<{ [group: string]: string[] }>({});

    // Feedback
    const [showHint, setShowHint] = useState(false);
    const [feedbackText, setFeedbackText] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [earnedCoins, setEarnedCoins] = useState(0);

    const PLAYER_WIDTH = 88;
    const TRIGGER_OFFSET = 80;
    const npcPositionsRef = useRef<number[]>([0, 0, 0]);

    // --- Init ---
    useEffect(() => {
        const w = window.innerWidth || 1200;
        npcPositionsRef.current = [Math.floor(w * 0.30), Math.floor(w * 0.60), Math.floor(w * 0.90)];
        moduleStartTimeRef.current = Date.now();
    }, []);

    useEffect(() => {
        const fetchLevels = async () => {
            try {
                const data = await fetchModuleLevels(moduleId);
                const rawLevels = data.levels ?? [];
                const lvls = rawLevels.map((l: any) => ({
                    _id: l._id,
                    levelID: l.levelID,
                    coins: l.coin ?? l.coins ?? 10,
                    questionID: l.questionID,
                    name: l.name ?? l.levelID,
                }));
                // Stub levels for demo if < 3
                while (lvls.length < 3) {
                    lvls.push({ _id: `stub-${lvls.length}`, levelID: `stub-${lvls.length}`, coins: 5, questionID: '', name: `Level ${lvls.length + 1}` });
                }
                setLevels(lvls);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLevels();
    }, [moduleId]);

    // --- Completion Watcher (Triggers Module Finish) ---
    useEffect(() => {
        if (levels.length > 0 && finishedLevels.size === levels.length && !showModuleSummary) {
            setAutoMove(false);

            // 1. Call Module Complete API
            // Passes moduleId as required by your route
            api.post('/api/progress/complete', { moduleId })
                .then((res) => {
                    console.log('Module marked complete', res);
                    // Optionally update local pet level from res.petLevel if context supports it
                })
                .catch(err => console.error('Failed to complete module', err));

            // 2. Show Summary Panel after delay
            const timer = setTimeout(() => {
                setShowModuleSummary(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [finishedLevels, levels, showModuleSummary, moduleId]);

    // --- Game Loop ---
    useEffect(() => {
        let raf = 0;
        let last = performance.now();
        const step = (t: number) => {
            const dt = (t - last) / 1000;
            last = t;
            const isInteracting = dialogueQueue !== null || question !== null || showSuccess || showModuleSummary;

            if (autoMove && !isInteracting) {
                playerRef.current.x += 200 * dt;
                setPlayerX(Math.round(playerRef.current.x));
                const pxRight = playerRef.current.x + PLAYER_WIDTH;
                for (let i = 0; i < npcPositionsRef.current.length; i++) {
                    if (levels[i] && !finishedLevels.has(i) && currentLevelIndex === null && pxRight >= npcPositionsRef.current[i] - TRIGGER_OFFSET) {
                        startLevel(i);
                    }
                }
            }
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [autoMove, dialogueQueue, question, showSuccess, showModuleSummary, currentLevelIndex, levels, finishedLevels]);

    // --- Logic ---

    const startLevel = async (index: number) => {
        setAutoMove(false);
        setCurrentLevelIndex(index);
        setFeedbackText(null);
        setShowSuccess(false);
        setShowHint(false);
        setUserAnswer('');
        setClassificationState({});

        // Reset question stats
        setCurrentQuestionMistakes(0);
        setCurrentReward(levels[index].coins); // Init to max coins for level

        const lvl = levels[index];
        playerRef.current.x = npcPositionsRef.current[index] - PLAYER_WIDTH - TRIGGER_OFFSET;
        setPlayerX(playerRef.current.x);

        try {
            const res = await fetchLevelDialogue(lvl._id);
            const content = res.dialogue?.content || [];
            if (content.length > 0) {
                setDialogueQueue(content);
                setDialogueIndex(0);
            } else {
                loadQuestion(lvl);
            }
        } catch (e) {
            console.warn("Failed to load dialogue", e);
            loadQuestion(lvl);
        }
    };

    const advanceDialogue = () => {
        if (!dialogueQueue) return;
        if (dialogueIndex < dialogueQueue.length - 1) {
            setDialogueIndex(dialogueIndex + 1);
        } else {
            setDialogueQueue(null);
            const lvl = levels[currentLevelIndex ?? 0];
            loadQuestion(lvl);
        }
    };

    const loadQuestion = async (lvl: LevelSummary) => {
        try {
            if (!lvl.questionID) throw new Error("No Question ID");
            const res = await fetchQuestion(lvl.questionID);
            const qData: QuestionData = res.question || res;
            setQuestion(qData);

            questionStartTimeRef.current = Date.now();
            setCurrentQuestionMistakes(0);

            if (qData.type === 'classification') {
                const initialGroups: { [key: string]: string[] } = {
                    "Unassigned": [...(qData.options || [])]
                };
                qData.groups?.forEach(g => {
                    initialGroups[g.groupName] = [];
                });
                setClassificationState(initialGroups);
            }
        } catch (e) {
            console.error("Failed to load question", e);
            closeLevel(false);
        }
    };

    const handleSuccess = async () => {
        setFeedbackText(null);

        const timeUsed = Date.now() - questionStartTimeRef.current;
        const coinsWon = currentReward;

        setEarnedCoins(coinsWon);
        setSessionCoins(prev => prev + coinsWon);
        setShowSuccess(true);

        if (question) {
            try {
                // Record per-question progress
                await api.post('/api/progress/record', {
                    questionID: question.questionID,
                    timeUsed,
                    wrongTimes: currentQuestionMistakes,
                    coins: coinsWon
                });
            } catch (e) {
                console.error("API Error", e);
            }
        }
    };

    const handleMistake = () => {
        setTotalMistakes(prev => prev + 1);
        setCurrentQuestionMistakes(prev => prev + 1);
        // Decrease reward by 2, minimum 1 coin
        setCurrentReward(prev => Math.max(1, prev - 2));
    };

    // --- Answer Handlers ---

    const handleOptionSelect = (option: string, index: number) => {
        if (!question) return;
        const isCorrect = option === question.answer;
        if (!isCorrect) {
            handleMistake();
            const wrongMsg = question.wrongText?.[index] || "That's not quite right.";
            setFeedbackText(wrongMsg);
        } else {
            handleSuccess();
        }
    };

    const handleWritingSubmit = () => {
        if (!question) return;
        const trimmed = userAnswer.trim();
        if (!trimmed) {
            setFeedbackText("Please write an answer first.");
            return;
        }

        const acceptableAnswers = Array.isArray(question.answer)
            ? question.answer
            : [question.answer || ""];

        const isCorrect = acceptableAnswers.some(ans =>
            ans.toLowerCase() === trimmed.toLowerCase()
        );

        if (isCorrect) {
            handleSuccess();
        } else {
            handleMistake();
            setFeedbackText("That doesn't seem to be what we're looking for. Try again!");
        }
    };

    const handleDragStart = (e: React.DragEvent, item: string, fromGroup: string) => {
        e.dataTransfer.setData("item", item);
        e.dataTransfer.setData("fromGroup", fromGroup);
    };

    const handleDrop = (e: React.DragEvent, targetGroup: string) => {
        e.preventDefault();
        const item = e.dataTransfer.getData("item");
        const fromGroup = e.dataTransfer.getData("fromGroup");
        if (!item || !fromGroup || fromGroup === targetGroup) return;

        setClassificationState(prev => {
            const newState = { ...prev };
            newState[fromGroup] = newState[fromGroup].filter(i => i !== item);
            newState[targetGroup] = [...newState[targetGroup], item];
            return newState;
        });
    };

    const handleClassificationSubmit = () => {
        if (!question || !question.groups) return;

        if (classificationState["Unassigned"]?.length > 0) {
            setFeedbackText("Please sort all items into the groups before checking.");
            return;
        }

        for (const group of question.groups) {
            const userItems = classificationState[group.groupName] || [];
            for (const item of userItems) {
                if (!group.items.includes(item)) {
                    handleMistake();
                    const originalIndex = question.options.indexOf(item);
                    const specificWrongText = question.wrongText?.[originalIndex];
                    setFeedbackText(specificWrongText || `"${item}" doesn't belong in ${group.groupName}.`);
                    return;
                }
            }
        }
        handleSuccess();
    };

    const closeLevel = (completed = true) => {
        if (completed && currentLevelIndex !== null) {
            setFinishedLevels(prev => {
                const next = new Set(prev);
                next.add(currentLevelIndex!);
                return next;
            });
        }

        setQuestion(null);
        setShowSuccess(false);
        setDialogueQueue(null);
        setUserAnswer('');
        setClassificationState({});

        if (currentLevelIndex !== null) {
            playerRef.current.x = npcPositionsRef.current[currentLevelIndex] + 100;
            setPlayerX(playerRef.current.x);
        }
        setCurrentLevelIndex(null);
        setAutoMove(true);
    };

    // --- Badge Logic ---
    const getBadge = () => {
        const durationSeconds = (Date.now() - moduleStartTimeRef.current) / 1000;
        const isFast = durationSeconds < 180; // 3 minutes

        if (totalMistakes === 0 && isFast) return { name: 'Rainbow', color: 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500', icon: '🌈' };
        if (totalMistakes === 0) return { name: 'Gold', color: 'bg-yellow-500', icon: '🥇' };
        if (totalMistakes === 1) return { name: 'Silver', color: 'bg-slate-400', icon: '🥈' };
        return { name: 'Bronze', color: 'bg-amber-700', icon: '🥉' };
    };

    if (loading) return <div className="h-screen bg-slate-900 text-white flex items-center justify-center">Loading...</div>;

    const currentSpeaker = dialogueQueue ? dialogueQueue[dialogueIndex].name : "";
    const currentLine = dialogueQueue ? dialogueQueue[dialogueIndex].text : "";

    const isClassification = question?.type === 'classification';

    return (
        <div className="relative w-full h-screen overflow-hidden font-sans select-none">

            {/* Background */}
            <div className="absolute inset-0 bg-[url('/module-background.png')] bg-cover bg-center" />

            {/* Overlay */}
            {(question || showSuccess || showModuleSummary || dialogueQueue) && (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-all duration-500 z-0" />
            )}

            {/* NPCs */}
            {npcPositionsRef.current.map((x, i) => {
                const isFinished = finishedLevels.has(i);
                return (
                    <div key={i} className={`absolute bottom-32 flex flex-col items-center z-10 transition-all duration-500 ${isFinished ? 'opacity-50 grayscale' : ''}`} style={{ left: x }}>
                        <div className="relative">
                            <div className="text-6xl mb-2">🐼</div>
                            {isFinished && <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white">✓</div>}
                        </div>
                        <div className="px-2 py-1 bg-black/60 text-white text-xs rounded-full backdrop-blur">{levels[i]?.name}</div>
                    </div>
                );
            })}

            {/* Player */}
            <div className="absolute bottom-32 z-20 transition-transform duration-100" style={{ left: playerX, width: PLAYER_WIDTH }}>
                <img src={pet === 'Dog' ? (autoMove ? '/pets/dog_walk_right.gif' : '/pets/dog_idle.gif') : (autoMove ? '/pets/cat_walk_right.gif' : '/pets/cat_idle.gif')} className="w-full drop-shadow-xl" alt="Player" />
            </div>

            {/* Back Button */}
            <div className="absolute top-4 left-4 z-50">
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-white/20 text-white rounded-full hover:bg-white/30 backdrop-blur transition">← Exit</button>
            </div>

            {/* --- TOP PROMPT (Standard Questions Only) --- */}
            {question && !showSuccess && !isClassification && (
                <div className="absolute top-4 left-0 right-0 z-50 flex justify-center px-4 animate-slideDown">
                    <div className="bg-slate-900/90 text-white p-4 rounded-xl shadow-2xl max-w-3xl w-full border border-indigo-500/30 flex items-start gap-4 backdrop-blur-md">
                        <div className="flex-1 text-lg font-medium leading-relaxed">
                            <span className="text-indigo-400 font-bold mr-2">Problem:</span>{question.problem}
                        </div>
                        <div className="relative group">
                            <button onClick={() => setShowHint(!showHint)} className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center font-bold shadow-lg transition">?</button>
                            {showHint && <div className="absolute top-12 right-0 w-64 bg-yellow-100 text-yellow-900 p-3 rounded-lg shadow-xl border border-yellow-300 text-sm animate-fadeIn"><strong>Tip:</strong> {question.tip}</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* --- INTERACTION PANEL --- */}
            {(dialogueQueue || (question && !showSuccess)) && (
                <div
                    className={`absolute left-0 right-0 z-50 animate-slideUp cursor-default 
                        ${isClassification
                            ? 'top-4 bottom-4 px-4 md:px-12 flex flex-col justify-center'
                            : 'bottom-0 h-[35vh]'
                        } 
                    `}
                >
                    <div className={`w-full bg-slate-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl flex flex-col relative
                         ${isClassification
                            ? 'h-full rounded-2xl border border-white/10'
                            : 'h-full'
                        }
                    `}>

                        {/* COIN LABEL (Dynamic Reward) */}
                        {question && !dialogueQueue && (
                            <div className="absolute top-0 right-0 transform -translate-y-1/2 bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full font-bold shadow-lg border-2 border-white z-50 flex items-center gap-1 animate-popIn">
                                <span>🪙</span>
                                <span>{currentReward}</span>
                                <span className="text-xs opacity-75 uppercase ml-1">Reward</span>
                            </div>
                        )}

                        {/* Dialogue Mode */}
                        {dialogueQueue && (
                            <div className="flex h-full" onClick={advanceDialogue}>
                                <div className="hidden md:block w-1/4 relative bg-gradient-to-r from-indigo-900/10 to-transparent" />
                                <div className="flex-1 p-8 flex flex-col justify-center cursor-pointer">
                                    <div className="absolute -top-6 left-6 md:left-8 bg-indigo-600 text-white px-6 py-2 rounded-t-lg font-bold shadow-lg text-lg tracking-wide">{currentSpeaker}</div>
                                    <p className="text-xl md:text-2xl text-white font-light leading-relaxed">"{currentLine}"</p>
                                    <div className="text-right text-sm text-white/50 animate-pulse mt-4">Tap to continue...</div>
                                </div>
                            </div>
                        )}

                        {/* Question Mode */}
                        {question && !dialogueQueue && (
                            <div className="h-full flex flex-col p-6 overflow-hidden">

                                {/* 1. CLASSIFICATION UI */}
                                {isClassification && (
                                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">

                                        {/* HEADER inside Panel */}
                                        <div className="bg-white/5 rounded-xl p-4 border border-indigo-500/30 flex items-start gap-4">
                                            <div className="flex-1 text-lg font-medium leading-relaxed text-white">
                                                <span className="text-indigo-400 font-bold mr-2">Problem:</span>{question.problem}
                                            </div>
                                            <div className="relative group">
                                                <button onClick={() => setShowHint(!showHint)} className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center font-bold shadow-lg transition">?</button>
                                                {showHint && <div className="absolute top-12 right-0 w-64 bg-yellow-100 text-yellow-900 p-3 rounded-lg shadow-xl border border-yellow-300 text-sm animate-fadeIn z-50"><strong>Tip:</strong> {question.tip}</div>}
                                            </div>
                                        </div>

                                        {/* Unassigned Pool */}
                                        <div
                                            className="bg-white/5 rounded-lg p-4 border border-dashed border-white/20 min-h-[80px]"
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => handleDrop(e, "Unassigned")}
                                        >
                                            <div className="text-xs text-indigo-300 uppercase font-bold mb-2">Items to Sort</div>
                                            <div className="flex flex-wrap gap-2">
                                                {classificationState["Unassigned"]?.map((item) => (
                                                    <div
                                                        key={item}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, item, "Unassigned")}
                                                        className="bg-white text-slate-900 px-4 py-2 rounded shadow cursor-grab active:cursor-grabbing font-medium hover:bg-indigo-50 transition-colors"
                                                    >
                                                        {item}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Drop Zones */}
                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                            {question.groups?.map(g => (
                                                <div
                                                    key={g.groupName}
                                                    className="bg-indigo-900/20 rounded-xl p-4 border-2 border-indigo-500/30 flex flex-col relative"
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => handleDrop(e, g.groupName)}
                                                >
                                                    <h3 className="text-indigo-200 font-bold text-center mb-4 pb-2 border-b border-white/10">{g.groupName}</h3>
                                                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                                                        {classificationState[g.groupName]?.map(item => (
                                                            <div
                                                                key={item}
                                                                draggable
                                                                onDragStart={(e) => handleDragStart(e, item, g.groupName)}
                                                                className="bg-indigo-600 text-white px-3 py-2 rounded shadow cursor-grab active:cursor-grabbing text-sm border border-white/20"
                                                            >
                                                                {item}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-2 flex justify-end">
                                            <button onClick={handleClassificationSubmit} className="px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg shadow-lg transition-transform hover:scale-105">Check Answers</button>
                                        </div>
                                    </div>
                                )}

                                {/* 2. WRITING UI */}
                                {question.type === 'writing' && (
                                    <div className="flex h-full">
                                        <div className="hidden md:block w-1/4 relative bg-gradient-to-r from-indigo-900/10 to-transparent" />
                                        <div className="flex-1 flex flex-col">
                                            <textarea
                                                className="w-full flex-1 bg-white/5 border border-white/10 rounded-lg p-4 text-white placeholder-white/30 resize-none focus:outline-none focus:border-indigo-500 focus:bg-white/10"
                                                placeholder="Type your answer here..."
                                                value={userAnswer}
                                                onChange={(e) => setUserAnswer(e.target.value)}
                                            />
                                            <div className="flex justify-end mt-4">
                                                <button onClick={handleWritingSubmit} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg">Submit Answer</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 3. SELECT UI */}
                                {question.type === 'select' && (
                                    <div className="flex h-full">
                                        <div className="hidden md:block w-1/4 relative bg-gradient-to-r from-indigo-900/10 to-transparent" />
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pb-2">
                                            {question.options?.map((opt, idx) => (
                                                <button key={idx} onClick={() => handleOptionSelect(opt, idx)} className="text-left p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400 transition-all group">
                                                    <span className="font-bold text-indigo-400 mr-2 group-hover:text-white">{String.fromCharCode(65 + idx)}.</span>
                                                    <span className="text-gray-100">{opt}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Feedback Area */}
                                <div className="mt-4 min-h-[40px] shrink-0">
                                    {feedbackText && (
                                        <div className="text-rose-400 bg-rose-900/20 px-4 py-2 rounded-lg border border-rose-500/20 flex items-center animate-shake">
                                            <span className="mr-3 text-xl">⚠️</span> {feedbackText}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- LEVEL SUCCESS OVERLAY --- */}
            {showSuccess && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className="absolute animate-fall" style={{ left: `${Math.random() * 100}%`, top: `-10%`, fontSize: `${Math.random() * 20 + 10}px`, animationDuration: `${Math.random() * 2 + 1}s`, animationDelay: `${Math.random()}s` }}>🪙</div>
                        ))}
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-2xl text-center transform scale-110 animate-popIn max-w-md mx-4 relative">
                        <div className="text-6xl mb-4 animate-bounce">🎉</div>
                        <h2 className="text-3xl font-bold text-indigo-900 mb-2">Correct!</h2>
                        <p className="text-gray-600 mb-6">You earned <span className="font-bold text-yellow-600">{earnedCoins} Coins</span>!</p>
                        <button onClick={() => closeLevel(true)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full shadow-lg transition-transform hover:scale-105">Continue Journey</button>
                    </div>
                </div>
            )}

            {/* --- MODULE SUMMARY (END GAME) --- */}
            {showModuleSummary && (
                <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-xl animate-fadeIn p-4">
                    <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(79,70,229,0.3)] border border-indigo-100 relative overflow-hidden">

                        {/* Decorative Background Blob */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50 to-transparent -z-0"></div>

                        <h1 className="text-3xl font-bold text-slate-800 mb-2 relative z-10">Module Complete!</h1>
                        <p className="text-slate-500 mb-8 relative z-10">You've finished all challenges.</p>

                        {/* Badge */}
                        <div className="flex justify-center mb-6 relative z-10">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl shadow-xl ${getBadge().color} border-4 border-white`}>
                                {getBadge().icon}
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 relative z-10">{getBadge().name} Badge</h2>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Total Coins</div>
                                <div className="text-2xl font-bold text-indigo-600">{sessionCoins}</div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Accuracy</div>
                                <div className="text-2xl font-bold text-emerald-600">
                                    {Math.max(0, 100 - (totalMistakes * 10))}%
                                </div>
                            </div>
                        </div>

                        {/* Exit Button */}
                        <button
                            onClick={() => navigate(-1)}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95 relative z-10"
                        >
                            Return to Map
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes slideDown { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
                @keyframes fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(360deg); opacity: 0; } }
                
                .animate-slideUp { animation: slideUp 0.4s ease-out; }
                .animate-slideDown { animation: slideDown 0.4s ease-out; }
                .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
                .animate-popIn { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .animate-shake { animation: shake 0.3s ease-in-out; }
                .animate-fall { animation: fall linear infinite; }
                
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
            `}</style>
        </div>
    );
}