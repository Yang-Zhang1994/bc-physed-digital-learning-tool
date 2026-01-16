import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { User } from "../models/user";

const router = Router();

async function assertTeacher(req: AuthedRequest, res: any) {
  const me = await User.findById(req.userId);
  if (!me) return { ok: false, status: 404, msg: "User not found" };
  if (me.type !== "teacher") return { ok: false, status: 403, msg: "Teacher only" };
  return { ok: true };
}

function computeStats(u: any) {
  const qres = (u.data && (u.data as any).questionResult) || {};
  let correct = 0;
  let incorrect = 0;
  const moduleToQuestionSet = new Map<string, Set<string>>();

  const addRecord = (r: any) => {
    if (!r || typeof r !== "object") return;

    // derive module key and question index from several possible shapes
    let moduleKey: string | null = null;
    let qIndex: string | null = null;

    if (typeof (r as any).questionID === "string") {
      const qid = String((r as any).questionID);
      const [prefix, idx] = qid.split("-");
      if (prefix) moduleKey = prefix; // e.g., "q1"
      if (idx) qIndex = idx;          // e.g., "1"
    }
    const candidates = [
      (r as any).moduleId,
      (r as any).moduleID,
      (r as any).module,
    ].filter(Boolean);
    if (!moduleKey && candidates.length > 0) moduleKey = String(candidates[0]);

    if (typeof (r as any).questionIndex === "number") {
      qIndex = String((r as any).questionIndex);
    }

    if (moduleKey) {
      if (!moduleToQuestionSet.has(moduleKey)) moduleToQuestionSet.set(moduleKey, new Set());
      if (qIndex != null) {
        moduleToQuestionSet.get(moduleKey)!.add(qIndex);
      } else if (typeof (r as any).questionID === "string") {
        // fallback: use full questionID to ensure uniqueness per module
        moduleToQuestionSet.get(moduleKey)!.add(String((r as any).questionID));
      }
    }

    if ("correct" in r) {
      (r as any).correct ? correct++ : incorrect++;
      return;
    }
    if ("wrongTimes" in r) {
      const wt = Number((r as any).wrongTimes ?? 0);
      wt > 0 ? incorrect++ : correct++;
    }
  };

  if (Array.isArray(qres)) {
    (qres as any[]).forEach(addRecord);
  } else {
    Object.values(qres).forEach((entry: any) => {
      if (Array.isArray(entry)) {
        (entry as any[]).forEach(addRecord);
      } else if (entry && typeof entry === "object") {
        // either a single record-like object or a map of id->record
        if ("questionID" in entry || "correct" in entry || "wrongTimes" in entry) {
          addRecord(entry);
        } else {
          Object.values(entry).forEach(addRecord);
        }
      }
    });
  }
  return {
    correct,
    incorrect,
    // A module is "completed" when it has records for at least 3 questions
    completedModulesCount: Array.from(moduleToQuestionSet.values()).filter((s) => s.size >= 3).length,
  };
}

// GET /api/teacher/students
router.get("/students", requireAuth, async (req: AuthedRequest, res) => {
  const check = await assertTeacher(req, res);
  if (!check.ok) return res.status((check as any).status).json({ msg: (check as any).msg });

  const students = await User.find({
    $or: [{ type: "student" }, { type: { $exists: false } }, { type: null }],
  }).select(
    "username petLevel coins completedModules data updatedAt createdAt"
  );
  const mapped = students.map((u) => {
    const stats = computeStats(u);
    return {
      id: u.id,
      username: u.username,
      petLevel: u.petLevel,
      coins: u.coins,
      updatedAt: u.updatedAt,
      createdAt: u.createdAt,
      ...stats,
    };
  });
  res.json({ students: mapped });
});

// GET /api/teacher/students/:id
router.get("/students/:id", requireAuth, async (req: AuthedRequest, res) => {
  const check = await assertTeacher(req, res);
  if (!check.ok) return res.status((check as any).status).json({ msg: (check as any).msg });
  const u = await User.findById(req.params.id).select(
    "username petLevel coins completedModules data updatedAt createdAt"
  );
  if (!u) return res.status(404).json({ msg: "Student not found" });
  const stats = computeStats(u);
  res.json({
    student: {
      id: u.id,
      username: u.username,
      petLevel: u.petLevel,
      coins: u.coins,
      completedModules: u.completedModules,
      questionResult: (u.data as any)?.questionResult || {},
      updatedAt: u.updatedAt,
      createdAt: u.createdAt,
      ...stats,
    },
  });
});

function toCSV(rows: any[]) {
  if (rows.length === 0) return "username,petLevel,coins,completedModules,correct,incorrect,updatedAt\n";
  const header = Object.keys(rows[0]).join(",");
  const lines = rows.map((r) =>
    Object.values(r)
      .map((v) => {
        const s = v == null ? "" : String(v);
        const needsQuote = s.includes(",") || s.includes('"') || s.includes("\n");
        const cleaned = s.replace(/"/g, '""');
        return needsQuote ? `"${cleaned}"` : cleaned;
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
}

// GET /api/teacher/report.csv (all students)
router.get("/report.csv", requireAuth, async (req: AuthedRequest, res) => {
  const check = await assertTeacher(req, res);
  if (!check.ok) return res.status((check as any).status).json({ msg: (check as any).msg });
  const students = await User.find({
    $or: [{ type: "student" }, { type: { $exists: false } }, { type: null }],
  }).select(
    "username petLevel coins completedModules data updatedAt"
  );
  const rows = students.map((u) => {
    const stats = computeStats(u);
    return {
      username: u.username,
      petLevel: u.petLevel,
      coins: u.coins,
      completedModules: stats.completedModulesCount,
      correct: stats.correct,
      incorrect: stats.incorrect,
      updatedAt: u.updatedAt?.toISOString?.() || "",
    };
  });
  const csv = toCSV(rows);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=students_report.csv");
  res.send(csv);
});

// GET /api/teacher/students/:id/report.csv
router.get("/students/:id/report.csv", requireAuth, async (req: AuthedRequest, res) => {
  const check = await assertTeacher(req, res);
  if (!check.ok) return res.status((check as any).status).json({ msg: (check as any).msg });
  const u = await User.findById(req.params.id).select(
    "username petLevel coins completedModules data updatedAt"
  );
  if (!u) return res.status(404).json({ msg: "Student not found" });
  const stats = computeStats(u);
  const rows = [
    {
      username: u.username,
      petLevel: u.petLevel,
      coins: u.coins,
      completedModules: stats.completedModulesCount,
      correct: stats.correct,
      incorrect: stats.incorrect,
      updatedAt: u.updatedAt?.toISOString?.() || "",
    },
  ];
  const csv = toCSV(rows);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${u.username}_report.csv`);
  res.send(csv);
});

export default router;

