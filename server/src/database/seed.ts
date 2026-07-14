/**
 * Seed BC PhysEd content (modules / levels / questions / dialogues).
 * CLI: cd server && npx ts-node --transpile-only src/database/seed.ts
 * Requires MONGO_URI in env or server/.env
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Module } from '../models/module';
import { GameLevel } from '../models/gameLevel';
import { Question } from '../models/question';
import { Dialogue } from '../models/dialogue';

const DIR = __dirname;

function loadJson(name: string): any[] {
  const raw = fs.readFileSync(path.join(DIR, name), 'utf8');
  const revived = raw
    .replace(/\{\s*"\$oid"\s*:\s*"([a-fA-F0-9]{24})"\s*\}/g, '"$1"')
    .replace(/\{\s*"\$date"\s*:\s*"([^"]+)"\s*\}/g, '"$1"');
  return JSON.parse(revived);
}

export async function runSeed(opts: { disconnect?: boolean } = {}) {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is required');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { dbName: 'bc-physed' });
  }
  console.log('Connected for seed', mongoose.connection.name);

  const questionsRaw = loadJson('questions.json');
  const dialoguesRaw = loadJson('dialogues.json');
  const levelsRaw = loadJson('gameLevels.json');

  await Promise.all([
    Question.deleteMany({}),
    Dialogue.deleteMany({}),
    GameLevel.deleteMany({}),
    Module.deleteMany({}),
  ]);

  const questions = await Question.insertMany(
    questionsRaw.map((q: any) => ({
      _id: q._id ? new mongoose.Types.ObjectId(String(q._id)) : undefined,
      questionID: q.questionID,
      problem: q.problem,
      type: q.type,
      options: q.options || [],
      optionImage: q.optionImage ?? null,
      answer: q.answer,
      tip: q.tip || '',
      wrongText: q.wrongText || [],
      groups: q.groups || {},
    }))
  );
  const qById = new Map(questions.map((q) => [q.questionID, q]));

  await Dialogue.insertMany(
    dialoguesRaw.map((d: any) => ({
      _id: d._id ? new mongoose.Types.ObjectId(String(d._id)) : undefined,
      dialogID: d.dialogID,
      content: d.content || [],
    }))
  );

  const levels: InstanceType<typeof GameLevel>[] = [];
  for (const L of levelsRaw) {
    const q = qById.get(L.questionID);
    if (!q) throw new Error(`Missing question ${L.questionID}`);
    levels.push(
      await GameLevel.create({
        levelID: L.levelID,
        dialogID: L.dialogID || '',
        coin: L.coin ?? 5,
        exp: L.exp ?? 10,
        questionID: q._id,
      })
    );
  }
  const levelsByModule = (prefix: string) =>
    levels.filter((l) => String(l.levelID).startsWith(prefix)).map((l) => l._id);

  await Module.create([
    {
      moduleID: '1',
      moduleName: 'Self-Care and Life Skills',
      levelIDs: levelsByModule('1-'),
    },
    {
      moduleID: '2',
      moduleName: 'Privacy and Boundaries',
      levelIDs: levelsByModule('2-'),
    },
    {
      moduleID: '3',
      moduleName: 'Communication Basics',
      levelIDs: levelsByModule('3-'),
    },
  ]);

  console.log(
    `Seeded questions=${questions.length} levels=${levels.length} modules=3 dialogues=${dialoguesRaw.length}`
  );

  if (opts.disconnect !== false && require.main === module) {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  runSeed({ disconnect: true }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
