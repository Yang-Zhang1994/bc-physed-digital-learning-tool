import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/api";

type Detail = {
  id: string;
  username: string;
  petLevel: number;
  coins: number;
  completedModules: string[];
  questionResult: Record<string, { questionIndex: number; correct: boolean; ts: string }[]>;
  correct: number;
  incorrect: number;
  completedModulesCount?: number;
};

export default function TeacherStudent() {
  const { id } = useParams();
  const [detail, setDetail] = useState<Detail | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/api/teacher/students/${id}`).then((res) => setDetail(res.data.student));
  }, [id]);

  const download = async () => {
    const res = await api.get(`/api/teacher/students/${id}/report.csv`, { responseType: "blob" });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detail?.username || "student"}_report.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  if (!detail) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/teacher")}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold">Student: {detail.username}</h1>
        </div>
        <button onClick={download} className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-4 py-2 rounded-lg transition">
          Download Report (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat title="Pet Level" value={detail.petLevel} />
        <Stat title="Coins" value={detail.coins} />
        <Stat title="Completed Modules" value={detail.completedModulesCount ?? 0} />
        <Stat title="Correct Answers" value={detail.correct} />
        <Stat title="Incorrect Answers" value={detail.incorrect} />
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold mb-2">Question Attempts</h2>
        <div className="space-y-3">
          {Object.entries(detail.questionResult || {}).map(([mod, attempts]) => (
            <div key={mod} className="border rounded-lg p-3">
              <p className="font-medium mb-1">Module {mod}</p>
              <ul className="list-disc list-inside text-sm text-gray-700">
                {attempts.map((a, idx) => (
                  <li key={idx}>
                    Q{a.questionIndex + 1}: {a.correct ? "Correct" : "Incorrect"} — {new Date(a.ts).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 text-center">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

