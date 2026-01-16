// Minimal moduleContext helper placed in context folder.
// Provides fetchModules() to retrieve module list from backend.

export type ModuleFromServer = {
    _id?: string;
    moduleID?: string | number;
    moduleId?: string | number;
    moduleName?: string;
    name?: string;
    levelIDs?: string[];
    radius?: number;
    type?: string;
    [k: string]: any;
};

export async function fetchModules(): Promise<ModuleFromServer[]> {
    // Use axios instance exported from src/api/api.ts
    const { api } = await import('../api/api');
    try {
        const res = await api.get('/api/content/modules');
        const payload = res?.data ?? null;
        if (!payload) return [];
        return Array.isArray(payload) ? payload : payload.modules ?? payload.data ?? [];
    } catch (err: any) {
        // normalize error message
        const msg = err?.response?.data ?? err?.message ?? String(err);
        throw new Error(`Failed to fetch modules: ${msg}`);
    }
}

// Types for content endpoints
export type LevelFromServer = {
    _id?: string;
    dialogID?: string;
    dialogId?: string;
    coin?: number;
    coins?: number;
    exp?: number;
    questionID?: string;
    questionId?: string;
    levelID?: string;
    levelId?: string;
    [k: string]: any;
};

export type ModuleLevelsResponse = {
    module?: ModuleFromServer;
    levels?: LevelFromServer[];
};

export type DialogueResponse = {
    level?: any;
    dialogue?: any;
};

export type QuestionResponse = {
    question?: any;
};

export async function fetchModuleLevels(moduleId: string): Promise<ModuleLevelsResponse> {
    const { api } = await import('../api/api');
    try {
        const res = await api.get(`/api/content/modules/${moduleId}/levels`);
        const data = res?.data ?? null;
        if (!data) throw new Error('Empty response');
        return data as ModuleLevelsResponse;
    } catch (err: any) {
        const msg = err?.response?.data ?? err?.message ?? String(err);
        throw new Error(`Failed to fetch module levels: ${msg}`);
    }
}

export async function fetchLevelDialogue(levelId: string): Promise<DialogueResponse> {
    const { api } = await import('../api/api');
    try {
        const res = await api.get(`/api/content/levels/${levelId}/dialogue`);
        return (res?.data ?? {}) as DialogueResponse;
    } catch (err: any) {
        const msg = err?.response?.data ?? err?.message ?? String(err);
        throw new Error(`Failed to fetch level dialogue: ${msg}`);
    }
}

export async function fetchQuestion(questionId: string): Promise<QuestionResponse> {
    const { api } = await import('../api/api');
    try {
        const res = await api.get(`/api/content/questions/${questionId}`);
        return (res?.data ?? {}) as QuestionResponse;
    } catch (err: any) {
        const msg = err?.response?.data ?? err?.message ?? String(err);
        throw new Error(`Failed to fetch question: ${msg}`);
    }
}

const moduleContext = { fetchModules, fetchModuleLevels, fetchLevelDialogue, fetchQuestion };
export default moduleContext;
