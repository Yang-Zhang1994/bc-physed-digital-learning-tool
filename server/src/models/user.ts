import { Schema, model, Document, Types } from 'mongoose';

// Pet state stored for the user's virtual pet
export interface IPetState {
  happiness: number;
  clean: number;
  hunger: number;
}

// GameData holds the in-game progress for a user
export interface IGameData {
  pet?: string | null; // e.g. "Dog"
  petName?: string;
  state?: IPetState;
  coins?: number;
  inventory?: string[];
  level?: number;
  completedModules?: (Types.ObjectId | string)[];
  badge?: string[];
  questionResult?: IQuestionResult[]; // array of question results (per question)
}

// Track how long a student took and how many wrong attempts
export interface IQuestionResult {
  questionID?: string | Types.ObjectId;
  time?: number; // seconds used to solve the question
  wrongTimes?: number; // number of wrong attempts
}

export interface IUser extends Document {
  username: string;
  password: string; // hashed
  type?: string; // optional user type
  data?: IGameData | null;

  // legacy/top-level fields (kept for compatibility)
  petLevel: number;
  completedModules: (Types.ObjectId | string)[];
  pet?: string | null;
  coins: number;
  inventory: string[];
}

const PetStateSchema = new Schema<IPetState>(
  {
    happiness: { type: Number, default: 50 },
    clean: { type: Number, default: 50 },
    hunger: { type: Number, default: 50 },
  },
  { _id: false }
);

const GameDataSchema = new Schema<IGameData>(
  {
    pet: { type: String, default: null },
    petName: { type: String, default: '' },
    state: { type: PetStateSchema, default: {} },
    coins: { type: Number, default: 50 },
    inventory: { type: [String], default: [] },
    level: { type: Number, default: 1 },
    completedModules: { type: [String], default: [] },
    badge: { type: [String], default: [] },
    // questionResult is an array of result objects for each question
    questionResult: { type: [{ questionID: { type: String }, time: { type: Number, default: 0 }, wrongTimes: { type: Number, default: 0 } }], default: [] },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    type: { type: String, default: 'student' },
    // Keep legacy/top-level fields for compatibility with existing routes
    petLevel: { type: Number, default: 1 },
    completedModules: { type: [String], default: [] },
    pet: { type: String, default: null },
    coins: { type: Number, default: 50 },
    inventory: { type: [String], default: [] },

    // New nested game data (mirrors above, optional)
    data: { type: GameDataSchema, default: {} },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
