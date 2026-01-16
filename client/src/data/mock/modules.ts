export type MultipleChoiceQuestion = {
  prompt: string;
  options: string[];
  answerIndex: number;
};

export type MatchingPair = {
  id: string;
  prompt: string;
  match: string;
};

export type MultipleChoiceModule = {
  id: number;
  title: string;
  type: "multiple-choice";
  questions: MultipleChoiceQuestion[];
};

export type MatchingModule = {
  id: number;
  title: string;
  type: "matching";
  description?: string;
  instructions?: string;
  pairs: MatchingPair[];
};

export type LevelMultipleChoiceQuestion = {
  type: "multiple-choice";
  prompt: string;
  options: string[];
  answerIndex: number;
};

export type LevelMatchingQuestion = {
  type: "matching";
  prompt: string;
  instructions?: string;
  pairs: MatchingPair[];
};

export type LevelShortAnswerQuestion = {
  type: "short-answer";
  prompt: string;
  acceptableAnswers: string[];
  placeholder?: string;
  hint?: string;
};

export type LevelQuestion =
  | LevelMultipleChoiceQuestion
  | LevelMatchingQuestion
  | LevelShortAnswerQuestion;

export type ModuleLevel = {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  accentColor?: string;
  question: LevelQuestion;
};

export type LeveledModule = {
  id: number;
  title: string;
  type: "leveled";
  intro?: string;
  outro?: string;
  levels: ModuleLevel[];
};

export type ModuleContent = MultipleChoiceModule | MatchingModule | LeveledModule;

export const mockModules: ModuleContent[] = [
  {
    id: 1,
    title: "Cardio and Fitness Basics",
    type: "multiple-choice",
    questions: [
      {
        prompt: "Which activity best improves cardiorespiratory endurance?",
        options: [
          "Jogging for 20 minutes",
          "Doing 5 push-ups",
          "Holding a plank for 30 seconds",
          "Static stretching",
        ],
        answerIndex: 0,
      },
      {
        prompt: "Which habit supports healthy recovery after exercise?",
        options: [
          "Drinking water and getting enough sleep",
          "Skipping cool-down to save time",
          "Only training the same muscle every day",
          "Avoiding all carbohydrates",
        ],
        answerIndex: 0,
      },
      {
        prompt: "Which measure best indicates workout intensity for most people?",
        options: [
          "Perceived exertion and heart rate",
          "Shoe brand and color",
          "How sweaty a friend looks",
          "Number of gym selfies",
        ],
        answerIndex: 0,
      },
    ],
  },
  {
    id: 2,
    title: "Healthy Training Habits",
    type: "multiple-choice",
    questions: [
      {
        prompt: "How often should a balanced fitness routine include rest or low-intensity days?",
        options: [
          "At least 1–2 times per week",
          "Never — train hard every day",
          "Only once a month",
          "Whenever you remember",
        ],
        answerIndex: 0,
      },
      {
        prompt: "Which pre-workout habit helps prevent injury?",
        options: [
          "Dynamic warm-ups that elevate heart rate",
          "Jumping straight into heavy lifts",
          "Skipping warm-ups to save energy",
          "Only doing static stretches for 15 minutes",
        ],
        answerIndex: 0,
      },
      {
        prompt: "What fuels muscles most effectively for moderate to intense workouts?",
        options: [
          "A balanced meal with carbohydrates and protein",
          "Only sugary snacks",
          "Large amounts of caffeine",
          "A glass of water is enough",
        ],
        answerIndex: 0,
      },
    ],
  },
  {
    id: 3,
    title: "Movement Mastery Mission",
    type: "leveled",
    intro: "Meet the coaching trio. Clear each level to unlock the next challenge and master how movement benefits your body.",
    outro: "Outstanding work—you’ve earned every badge!",
    levels: [
      {
        id: "level-1",
        name: "Level 1 · Coach Sky",
        description: "Kick off with a cardio check-in.",
        avatar: "🧑‍🦱",
        accentColor: "bg-sky-400",
        question: {
          type: "multiple-choice",
          prompt: "Coach Sky asks: which choice best boosts heart and lung endurance?",
          options: [
            "Jogging or cycling for 20 minutes",
            "Holding a wall sit for 30 seconds",
            "Practicing balance on one leg",
            "Doing five explosive push-ups",
          ],
          answerIndex: 0,
        },
      },
      {
        id: "level-2",
        name: "Level 2 · Coach Ember",
        description: "Shift to power and strength.",
        avatar: "🧑‍🦰",
        accentColor: "bg-amber-400",
        question: {
          type: "matching",
          prompt: "Coach Ember’s challenge: match each strength focus with the best training habit.",
          instructions: "Drag the habit cards to the focus areas to prove you’re ready for more power.",
          pairs: [
            {
              id: "progressive",
              prompt: "Build strength without burnout",
              match: "Plan progressive overload with rest and recovery days.",
            },
            {
              id: "warmup",
              prompt: "Protect muscles and joints",
              match: "Complete dynamic warm-ups before heavy lifts.",
            },
            {
              id: "form",
              prompt: "Lift with confidence",
              match: "Focus on controlled reps and proper form each session.",
            },
          ],
        },
      },
      {
        id: "level-3",
        name: "Level 3 · Coach River",
        description: "Balance and flexibility finale.",
        avatar: "🧑‍🦳",
        accentColor: "bg-emerald-400",
        question: {
          type: "short-answer",
          prompt: "Coach River asks: name one mindful practice that keeps joints mobile and reduces injury risk before activity.",
          acceptableAnswers: [
            "dynamic stretching",
            "dynamic stretches",
            "dynamic warm-up",
            "dynamic warmup",
            "dynamic warm ups",
            "yoga",
            "mindful yoga",
          ],
          placeholder: "Type your answer here",
          hint: "Think about mobility work you can do before training.",
        },
      },
    ],
  },
];

