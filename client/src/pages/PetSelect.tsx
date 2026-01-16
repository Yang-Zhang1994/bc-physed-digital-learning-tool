import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { usePet } from "../context/PetContext";
import { useState } from "react";

export default function PetSelect() {
  const { setPet } = usePet();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [clicked, setClicked] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pets = [
    {
      name: "Cat",
      idle: "/pets/cat_drink.gif",
      wave: "/pets/cat_love.gif",
    },
    {
      name: "Dog",
      idle: "/pets/dog_rest.gif",
      wave: "/pets/dog_play.gif",
    },
  ];

  // 🐾 Choose pet visually, don't call backend yet
  function choosePet(name: string) {
    setSelected(name);
    setClicked(name);
    setTimeout(() => setClicked(null), 1500);
  }

  // 🐾 Now actually call backend + navigate
  async function startAdventure() {
    if (!selected) return;
    try {
      setIsLoading(true);
      await setPet(selected); // backend call to /api/pet/choose
      navigate("/map");       // only after successful pet save
    } catch (err) {
      console.error("Failed to choose pet:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-emerald-100 to-lime-100">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-10 drop-shadow-md">
        Choose Your Pet
      </h1>

      <div className="flex gap-10">
        {pets.map((p) => (
          <motion.div
            key={p.name}
            onClick={() => choosePet(p.name)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`cursor-pointer flex flex-col items-center p-6 rounded-2xl shadow-lg border-2 transition-all ${
              selected === p.name
                ? "border-blue-500 bg-white/80 scale-105"
                : "border-transparent bg-white/60 hover:border-gray-300"
            }`}
          >
            <motion.img
              src={clicked === p.name ? p.wave : p.idle}
              alt={p.name}
              className="w-40 h-40 object-contain mb-4 rounded-xl"
              animate={
                clicked === p.name
                  ? { rotate: [0, 5, -5, 0], transition: { duration: 1, repeat: 1 } }
                  : {}
              }
            />
            <p
              className={`text-lg font-semibold ${
                selected === p.name ? "text-blue-600" : "text-gray-700"
              }`}
            >
              {p.name}
            </p>
          </motion.div>
        ))}
      </div>

      <button
        disabled={!selected || isLoading}
        onClick={startAdventure}
        className={`mt-10 px-6 py-3 rounded-xl text-lg font-semibold shadow-md transition 
          ${
            selected
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-300 text-gray-600 cursor-not-allowed"
          }`}
      >
        {isLoading ? "Loading..." : "Start Adventure"}
      </button>
    </div>
  );
}
