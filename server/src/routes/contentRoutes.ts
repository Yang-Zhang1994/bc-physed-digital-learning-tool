import { Router } from 'express';
import { Module } from '../models/module';
import { GameLevel } from '../models/gameLevel';
import { Dialogue } from '../models/dialogue';
import { Question } from '../models/question';
import { User } from '../models/user';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const router = Router();

// GET /api/content/modules
router.get('/modules', async (_req, res) => {
    const modules = await Module.find().select('-__v -createdAt -updatedAt');
    res.json({ modules });
});

// GET /api/content/modules/:id/levels
// :id can be Mongo _id or moduleID string
router.get('/modules/:id/levels', async (req, res) => {
    const { id } = req.params;
    let mod = null;
    try { mod = await Module.findById(id); } catch (e) { /* ignore */ }
    if (!mod) mod = await Module.findOne({ moduleID: id });
    if (!mod) return res.status(404).json({ msg: 'Module not found' });

    // Module now may contain an array of levelIDs (levelIDs). Try to fetch by _id or levelID values.
    const levelRefs = (mod as any).levelIDs;
    let levels = [];
    if (!Array.isArray(levelRefs) || levelRefs.length === 0) {
        // fallback: return all levels
        levels = await GameLevel.find({}).select('-__v -createdAt -updatedAt');
    } else {
        // Find game levels either by _id (ObjectId) or by levelID string
        levels = await GameLevel.find({
            $or: [
                { _id: { $in: levelRefs } },
                { levelID: { $in: levelRefs } }
            ]
        }).select('-__v -createdAt -updatedAt');
    }

    res.json({ module: mod, levels });
});

// GET /api/content/levels/:id/dialogue
// :id can be GameLevel _id or levelID string
router.get('/levels/:id/dialogue', async (req, res) => {
    const { id } = req.params;
    let level = null;
    try { level = await GameLevel.findById(id); } catch (e) { /* ignore */ }
    if (!level) level = await GameLevel.findOne({ levelID: id });
    if (!level) return res.status(404).json({ msg: 'Level not found' });

    // Resolve dialogue using `level.dialogID` (the schema now stores a string identifier).
    // Try finding by Dialogue.dialogID first; if that fails and the value looks like an ObjectId, try findById.
    let dialogue = null;
    const dialogRef = (level as any).dialogID;
    if (typeof dialogRef === 'string' && dialogRef.length > 0) {
        // prefer the string identifier stored in Dialogue.dialogID
        dialogue = await Dialogue.findOne({ dialogID: dialogRef });
        if (!dialogue && /^[a-fA-F0-9]{24}$/.test(dialogRef)) {
            // maybe the string is actually an ObjectId; try to fetch by _id
            try { dialogue = await Dialogue.findById(dialogRef); } catch (e) { dialogue = null; }
        }
    } else if (dialogRef && typeof dialogRef === 'object' && typeof (dialogRef as any).dialogID === 'string') {
        // in case the field was populated earlier and contains the document
        dialogue = await Dialogue.findOne({ dialogID: (dialogRef as any).dialogID });
    }

    res.json({ level, dialogue });
});

// GET /api/content/questions/:id
// :id can be Question _id or questionID
router.get('/questions/:id', async (req, res) => {
    const { id } = req.params;
    let q = null;
    try { q = await Question.findById(id); } catch (e) { /* ignore */ }
    if (!q) q = await Question.findOne({ questionID: id });
    if (!q) return res.status(404).json({ msg: 'Question not found' });
    res.json({ question: q });
});

// GET /api/content/game/pet-state (protected)
router.get('/game/pet-state', requireAuth, async (req: AuthedRequest, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const state = (user.data && (user.data as any).state) || {
        happiness: 50,
        clean: 50,
        hunger: 50,
    };

    res.json({ pet: user.pet, petLevel: user.petLevel, state });
});

// GET /api/content/game/inventory (protected)
router.get('/game/inventory', requireAuth, async (req: AuthedRequest, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const inventory = user.inventory || (user.data && (user.data as any).inventory) || [];
    res.json({ inventory, coins: user.coins });
});

export default router;
