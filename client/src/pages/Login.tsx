import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { usePet } from "../context/PetContext";
import { useNavigate } from "react-router-dom";
import { api } from "../api/api";

export default function Login() {
  const { login, logout } = useAuth();
  const { refreshPetData } = usePet();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"student" | "teacher">("student");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (mode === "register") {
        // create account then automatically log in
        await api.post("/api/auth/register", { username, password, type: activeTab });
        // auto-login the newly created user
        const user = await login(username, password);

        // sync pet data
        await refreshPetData();

        if (activeTab === "teacher") {
          if (user.type !== "teacher") {
            setMsg("This account is not a teacher. Please switch to Student Login or use a teacher account.");
            logout();
            return;
          }
          navigate("/teacher");
        } else {
          const { data } = await api.get("/api/pet");
          if (data.pet) {
            navigate("/map");
          } else {
            navigate("/pet");
          }
        }
      } else {
        const user = await login(username, password);

        // 🐾 Ensure pet data is synced
        await refreshPetData();

        // ✅ Fetch latest pet data directly for guaranteed redirect accuracy
        if (activeTab === "teacher") {
          if (user.type !== "teacher") {
            setMsg("This account is not a teacher. Please switch to Student Login or use a teacher account.");
            logout();
            return;
          }
          navigate("/teacher");
        } else {
          const { data } = await api.get("/api/pet");
          if (data.pet) {
            navigate("/map");
          } else {
            navigate("/pet");
          }
        }
      }
    } catch (err: any) {
      setMsg(err?.response?.data?.msg ?? "Something went wrong");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow p-8">
        {mode === 'login' && (
          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-xl bg-gray-100 p-1">
              <button
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeTab === "student" ? "bg-white shadow" : "text-gray-600"}`}
                onClick={() => setActiveTab("student")}
                type="button"
              >
                Student Login
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${activeTab === "teacher" ? "bg-white shadow" : "text-gray-600"}`}
                onClick={() => setActiveTab("teacher")}
                type="button"
              >
                Teacher Login
              </button>
            </div>
          </div>
        )}
        <h1 className="text-2xl font-bold text-center mb-6">
          {mode === "login"
            ? activeTab === "teacher"
              ? "Teacher Login"
              : "Student Login"
            : activeTab === "teacher"
              ? "Create Teacher Account"
              : "Create Student Account"}
        </h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="w-full border rounded-md p-2"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            className="w-full border rounded-md p-2"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
            {mode === "login" ? "Login" : "Register"}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button
                className="text-blue-600 underline"
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                className="text-blue-600 underline"
                onClick={() => setMode("login")}
              >
                Login
              </button>
            </>
          )}
        </p>

        {msg && <p className="text-center text-red-600 mt-3">{msg}</p>}
      </div>
    </div>
  );
}
