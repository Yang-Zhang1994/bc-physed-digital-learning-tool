import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePet } from "../context/PetContext";
import ColdStartWaitNote from "./ColdStartWaitNote";

type Props = {
  children: React.ReactNode;
  requirePet?: boolean;
  blockIfPet?: boolean;
  requireTeacher?: boolean;
};

export default function ProtectedRoute({
  children,
  requirePet = false,
  blockIfPet = false,
  requireTeacher = false,
}: Props) {
  const { user } = useAuth();
  const { pet, isLoading } = usePet();

  if (isLoading) {
    return (
      <div className="text-center mt-10 px-6 max-w-md mx-auto space-y-3">
        <p className="font-semibold">Loading...</p>
        <ColdStartWaitNote className="text-slate-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requireTeacher && user.type !== 'teacher') return <Navigate to="/" replace />;
  if (requirePet && !pet) return <Navigate to="/pet" replace />;
  if (blockIfPet && pet) return <Navigate to="/map" replace />;

  return <>{children}</>; // wrap in fragment
}
