import { Schema, model, Document, Types } from 'mongoose';

export interface IGameLevel extends Document {
    // references to Dialogue and Question
    // `dialogID` is now a string identifier (Dialogue.dialogID)
    dialogID?: string | null;
    coin?: number;
    exp?: number;
    questionID?: Types.ObjectId | string | null;
    // an optional level identifier or parent linkage
    levelID?: string;
}

const gameLevelSchema = new Schema<IGameLevel>(
    {
        // store the dialogue identifier string (Dialogue.dialogID)
        dialogID: { type: String, default: '' },
        coin: { type: Number, default: 0 },
        exp: { type: Number, default: 0 },
        questionID: { type: Schema.Types.ObjectId, ref: 'Question', default: null },
        levelID: { type: String, default: '' },
    },
    { timestamps: true }
);

export const GameLevel = model<IGameLevel>('GameLevel', gameLevelSchema);
