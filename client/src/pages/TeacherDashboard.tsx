import { useEffect, useState } from "react";
import { api } from "../api/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type StudentRow = {
  id: string;
  username: string;
  petLevel: number;
  coins: number;
  completedModulesCount: number;
  correct: number;
  incorrect: number;
  updatedAt: string;
};

export default function TeacherDashboard() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    api
      .get("/api/teacher/students")
      .then((res) => {
        setRows(res.data.students || []);
        setError(null);
      })
      .catch((e) => {
        setError(e?.response?.data?.msg || "Failed to load students");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const downloadAll = async () => {
    const res = await api.get("/api/teacher/report.csv", { responseType: "blob" });
    const url = window.URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_report.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <div className="flex items-center gap-2">
          <button onClick={downloadAll} className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-4 py-2 rounded-lg transition">
            Download All Reports (CSV)
          </button>
          <div className="relative">
            <button
              onClick={() => setShowProfile((s) => !s)}
              className="ml-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
            >
              {user?.username ?? "Me"} ▾
            </button>
            {showProfile && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                <p className="text-sm text-gray-500">Signed in as</p>
                <p className="mt-1 text-base font-semibold">{user?.username}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="text-gray-500">Role</p>
                    <p className="font-medium capitalize">{user?.type ?? "teacher"}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="text-gray-500">User ID</p>
                    <p className="font-mono text-xs break-all">{user?.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowProfile(false); logout(); }}
                  className="mt-3 w-full rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-600"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">
          {error}
        </div>
      )}

      {rows.length === 0 && !error && (
        <div className="mb-3 rounded-lg border border-gray-200 bg-white p-3 text-gray-700">
          No students found yet.
        </div>
      )}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-full">
          <thead className="bg-gray-100 text-sm">
            <tr>
              <th className="text-left p-3">Student</th>
              <th className="text-left p-3">Pet Level</th>
              <th className="text-left p-3">Coins</th>
              <th className="text-left p-3">Completed Modules</th>
              <th className="text-left p-3">Correct</th>
              <th className="text-left p-3">Incorrect</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{s.username}</td>
                <td className="p-3">{s.petLevel}</td>
                <td className="p-3">{s.coins}</td>
                <td className="p-3">{s.completedModulesCount ?? 0}</td>
                <td className="p-3 text-green-700">{s.correct ?? 0}</td>
                <td className="p-3 text-red-600">{s.incorrect ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

