import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import GameMap from "./pages/GameMap";
//import ModulePage from "./pages/ModulePage";
import ModulePageGame from "./pages/ModulePageGame";
import ProfilePage from "./pages/profilePage";
import PetSelect from "./pages/PetSelect";
import PetStorePage from "./pages/PetStorePage";
import { AuthProvider } from "./context/AuthContext";
import { PetProvider } from "./context/PetContext";
import ProtectedRoute from "./components/ProtectedRoute";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherStudent from "./pages/TeacherStudent";
import ServerWakeupNotice from "./components/ServerWakeupNotice";

export default function App() {
  console.log("✅ API base URL:", import.meta.env.VITE_API_URL);

  return (
    <PetProvider>
      <AuthProvider>
        <BrowserRouter>
          <ServerWakeupNotice />
          <Routes>
            {/* Public route */}
            <Route path="/" element={<Login />} />

            {/* Pet selection (only for logged-in users without a pet) */}
            <Route
              path="/pet"
              element={
                <ProtectedRoute blockIfPet>
                  <PetSelect />
                </ProtectedRoute>
              }
            />

            {/* Game map (requires pet) */}
            <Route
              path="/map"
              element={
                <ProtectedRoute requirePet>
                  <GameMap />
                </ProtectedRoute>
              }
            />

            {/* Modules (require pet) */}
            <Route
              path="/module/:id"
              element={
                <ProtectedRoute requirePet>
                  <ModulePageGame />
                </ProtectedRoute>
              }
            />

            {/* Pet store (require pet) */}
            <Route
              path="/store"
              element={
                <ProtectedRoute requirePet>
                  <PetStorePage />
                </ProtectedRoute>
              }
            />

            {/* Teacher routes */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute requireTeacher>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/students/:id"
              element={
                <ProtectedRoute requireTeacher>
                  <TeacherStudent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute requirePet>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />


            {/* Fallback */}
            <Route path="*" element={<Login />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </PetProvider>
  );
}
