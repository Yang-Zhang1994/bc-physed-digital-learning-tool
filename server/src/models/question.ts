import { Schema, model, Document, Types } from 'mongoose';

// Generic Question model to cover Select, Classification and Writing types
export interface IQuestion extends Document {
    questionID: string;
    problem?: string;
    type?: string; // e.g. 'select' | 'classification' | 'writing'

    // Select & Classification
    options?: string[];
    optionImage?: string[] | null;
    answer?: string | string[]; // single or multiple answers
    tip?: string;
    wrongText?: string[];

    // Classification-specific groups (flexible structure)
    groups?: any;
}

const questionSchema = new Schema<IQuestion>(
    {
        questionID: { type: String, required: true, unique: true, index: true },
        problem: { type: String, default: '' },
        type: { type: String, default: 'select' },
        options: { type: [String], default: [] },
        optionImage: { type: [String], default: null },
        answer: { type: Schema.Types.Mixed, default: '' },
        tip: { type: String, default: '' },
        wrongText: { type: [String], default: [] },
        groups: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

export const Question = model<IQuestion>('Question', questionSchema);
