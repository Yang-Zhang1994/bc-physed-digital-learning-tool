import { Schema, model, Document, Types } from 'mongoose';

export interface IModule extends Document {
    moduleID: string;
    moduleName: string;
    // references to multiple GameLevel documents
    levelIDs?: (Types.ObjectId | string)[];
}

const moduleSchema = new Schema<IModule>(
    {
        moduleID: { type: String, required: true, unique: true, index: true },
        moduleName: { type: String, required: true },
        levelIDs: { type: [Schema.Types.ObjectId], ref: 'GameLevel', default: [] },
    },
    { timestamps: true }
);

export const Module = model<IModule>('Module', moduleSchema);
