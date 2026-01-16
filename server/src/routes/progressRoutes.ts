import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { User } from "../models/user";

const router = Router();

// Record a question attempt/result for the current user
router.post("/record", requireAuth, async (req: AuthedRequest, res) => {
  // Expected body: { questionID, timeUsed, wrongTimes, coins }
  const { questionID, timeUsed, wrongTimes, coins } = req.body || {};
  if (!questionID || typeof timeUsed !== "number" || typeof wrongTimes !== "number") {
    return res.status(400).json({ msg: "Invalid input. Require questionID, timeUsed(number), wrongTimes(number)" });
  }
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ msg: "User not found" });

  // Ensure nested data exists
  const data: any = user.data ?? {};
  data.questionResult = data.questionResult ?? [];

  // push or merge the new question result
  const entry = { questionID, time: timeUsed, wrongTimes };
  // try to find an existing record for the same questionID
  const existingIndex = data.questionResult.findIndex((r: any) => String(r.questionID) === String(questionID));
  if (existingIndex === -1) {
    // no existing record, append
    data.questionResult.push(entry);
  } else {
    // merge: prefer fewer wrongTimes; if equal, prefer faster time
    const existing = data.questionResult[existingIndex] as any;
    const existingWrong = typeof existing.wrongTimes === 'number' ? existing.wrongTimes : Infinity;
    const existingTime = typeof existing.time === 'number' ? existing.time : Infinity;
    if (wrongTimes < existingWrong) {
      // strictly better by wrongAttempts
      data.questionResult[existingIndex] = entry;
    } else if (wrongTimes === existingWrong && timeUsed < existingTime) {
      // same wrong attempts but faster time
      data.questionResult[existingIndex] = entry;
    } // else keep existing (it is better or equal and faster)
  }

  // persist nested data back to user
  user.set("data", data);

  // add coins to user's top-level and nested data.coins if provided
  if (typeof coins === "number" && !Number.isNaN(coins) && coins !== 0) {
    user.coins = (user.coins ?? 0) + coins;
    data.coins = (data.coins ?? 0) + coins;
    user.set("data", data);
  }

  await user.save();

  res.json({ ok: true, coins: user.coins, questionResults: data.questionResult.length });
});

router.post("/complete", requireAuth, async (req: AuthedRequest, res) => {
  const { moduleId } = req.body;
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ msg: "User not found" });

  if (!user.completedModules.includes(moduleId)) {
    user.completedModules.push(moduleId);
    //user.coins += 10;      // reward coins
    user.petLevel += 1;    // pet grows stronger
    // decrease pet hunger by 10 (clamp at 0)
    const data: any = user.data ?? {};
    data.state = data.state ?? {};
    const curHunger = typeof data.state.hunger === 'number' ? data.state.hunger : 0;
    data.state.hunger = Math.max(0, curHunger - 10);
    user.set('data', data);
    await user.save();
  }

  res.json({
    completedModules: user.completedModules,
    coins: user.coins,
    petLevel: user.petLevel,
  });
});

export default router;
