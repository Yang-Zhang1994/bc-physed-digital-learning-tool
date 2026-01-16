import { Schema, model, Document } from 'mongoose';

export interface IEvent {
    action: string;
    target?: string;
    value?: string;
}

export interface IDialogueText {
    text: string;
    name?: string;
    events?: IEvent[];
}

export interface IDialogue extends Document {
    dialogID: string;
    content: IDialogueText[];
}

const EventSchema = new Schema<IEvent>(
    {
        action: { type: String, required: true },
        target: { type: String, default: '' },
        value: { type: String, default: '' },
    },
    { _id: false }
);

const DialogueTextSchema = new Schema<IDialogueText>(
    {
        text: { type: String, required: true },
        name: { type: String, default: '' },
        events: { type: [EventSchema], default: [] },
    },
    { _id: false }
);

const dialogueSchema = new Schema<IDialogue>(
    {
        dialogID: { type: String, required: true, unique: true, index: true },
        content: { type: [DialogueTextSchema], default: [] },
    },
    { timestamps: true }
);

export const Dialogue = model<IDialogue>('Dialogue', dialogueSchema);
