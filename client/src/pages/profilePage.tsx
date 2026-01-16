import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePet } from "../context/PetContext";

export default function ProfilePage() {
  const { logout } = useAuth();
  const {
    pet,
    coins,
    inventory,
    clearInventory,
    changePet,
    refreshPetData,
    feedPet,
    petState,
    petLevel,
  } = usePet();

  const navigate = useNavigate();

  // 🐾 Pet stats
  const [hunger, setHunger] = useState<number>(petState?.hunger ?? 80);
  const level = typeof petLevel === "number" ? petLevel : 1;
  const [feeding, setFeeding] = useState(false);
  const [message, setMessage] = useState("");

  // ⭐ Equipped Items
  const [equipped, setEquipped] = useState<string[]>([]);

  // ⭐ Count Food
  const foodCount = inventory.filter((i) =>
    i === "Pet Food"
  ).length;

  const hasFood = foodCount > 0;

  // Hunger decay over time
  useEffect(() => {
    const interval = setInterval(() => {
      setHunger((h) => Math.max(0, h - 1));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // ensure we have fresh pet data when this page mounts
  useEffect(() => {
    refreshPetData();
  }, [refreshPetData]);

  // sync hunger from server pet state when available
  useEffect(() => {
    if (petState && typeof petState.hunger === "number") {
      setHunger(petState.hunger);
    }
  }, [petState]);

  // --- Actions ---
  const handleClearInventory = async () => {
    if (confirm("Are you sure you want to clear your inventory?")) {
      await clearInventory();
      await refreshPetData();
      alert("Inventory cleared!");
    }
  };

  const handleChangePet = async () => {
    const newPet = prompt("Enter new pet name:");
    if (!newPet) return;

    await changePet(newPet);
    await refreshPetData();
    alert(`Your pet is now: ${newPet}`);
  };

  const handleFeed = async () => {
    if (!hasFood || feeding) return;

    setFeeding(true);
    setMessage(`${pet} is eating happily! 🍖`);

    try {
      const data = await feedPet(25); // backend removes food and returns updated state; request +25 hunger
      if (data && data.state && typeof data.state.hunger === "number") {
        setHunger(data.state.hunger);
      } else {
        // fallback local update
        setHunger((h) => Math.min(100, h + 25));
      }
      // refresh inventory/state from server
      await refreshPetData();
    } catch (err: any) {
      alert(err?.response?.data?.msg || "Unable to feed pet.");
    }

    await new Promise((r) => setTimeout(r, 2500));

    setFeeding(false);
    setMessage(`${pet} looks full and happy 😋`);
  };

  const toggleEquip = (item: string) => {
    if (equipped.includes(item)) {
      setEquipped(equipped.filter((i) => i !== item));
    } else {
      setEquipped([...equipped, item]);
    }
  };

  const hungerColor =
    hunger > 70 ? "bg-green-400" : hunger > 30 ? "bg-yellow-400" : "bg-red-400";

  const petGif = feeding
    ? pet === "Dog"
      ? "/pets/dog_eat.gif"
      : "/pets/cat_eat.gif"
    : pet === "Dog"
      ? "/pets/dog_idle.gif"
      : "/pets/cat_idle.gif";

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-amber-50 to-rose-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">🐾 Profile</h1>

      {/* Coins badge (top-right) */}
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-white/90 px-3 py-1 rounded-full shadow border border-gray-200">
        <span className="text-lg">🪙</span>
        <span className="font-semibold text-gray-700">{coins ?? 0}</span>
      </div>

      {/* 🐾 PET + ACCESSORIES */}
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-2xl mb-8 flex flex-col items-center">
        <motion.div
          className="relative w-56 h-56 flex items-center justify-center"
          animate={feeding ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={{ duration: 0.6, repeat: feeding ? Infinity : 0 }}
        >
          {/* Pet GIF */}
          <img
            src={petGif}
            alt="pet"
            className="w-full h-full object-contain select-none drop-shadow-lg"
            draggable={false}
          />

          {/* 🎩 Fancy Hat */}
          {equipped.includes("Fancy Hat") && (
            <div
              className={`
                absolute text-4xl -translate-x-1/2
                ${pet === "Dog" ? "-top-4 left-[54%]" : "-top-10 left-[58%]"}
              `}
            >
              🎩
            </div>
          )}

          {/* ⚽ Ball Toy */}
          {equipped.includes("Ball Toy") && (
            <motion.div
              className="absolute bottom-4 right-6 text-3xl"
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              ⚽
            </motion.div>
          )}

          {/* 🍖 Food during feeding */}
          <AnimatePresence>
            {feeding && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: -10 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.5 }}
                className="absolute bottom-0 text-4xl"
              >
                🍖
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Hunger Bar */}
        <div className="w-64 h-5 bg-gray-200 rounded-full mt-6 overflow-hidden">
          <div
            className={`h-full ${hungerColor} transition-all duration-500`}
            style={{ width: `${hunger}%` }}
          />
        </div>

        <p className="text-sm text-gray-600 mt-1">Hunger: {hunger}/100</p>
        <p className="text-sm text-gray-600 mt-1">
          🍖 Food owned: {foodCount}
        </p>

        {/* Level + Feed Button */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="font-semibold text-lg text-gray-700">Level {level}</p>

          <button
            onClick={handleFeed}
            disabled={!hasFood || feeding}
            className={`px-5 py-2 rounded-xl font-semibold text-white transition ${!hasFood
              ? "bg-gray-400 cursor-not-allowed"
              : feeding
                ? "bg-yellow-400 animate-pulse"
                : "bg-orange-500 hover:bg-orange-600"
              }`}
          >
            {feeding ? "Feeding..." : "Feed 🍖"}
          </button>
        </div>

        {/* Message Bubble */}
        <AnimatePresence>
          {message && (
            <motion.div
              key="msg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="mt-4 bg-white/90 px-6 py-3 rounded-xl shadow border border-gray-200 text-gray-700 font-medium"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ⭐ INVENTORY GRID */}
      <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">🎒 Owned Items</h2>

        {inventory.length === 0 ? (
          <p className="text-gray-400 italic">Your bag is empty.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {(() => {
              const counts = inventory.reduce((m: Record<string, number>, it) => {
                m[it] = (m[it] || 0) + 1;
                return m;
              }, {} as Record<string, number>);
              const unique = Object.keys(counts);
              return unique.map((item, index) => {
                const count = counts[item] || 0;
                const isFood = item === "Pet Food" || item.includes("Food");
                return (
                  <div key={index}>
                    <button
                      onClick={() => {
                        if (!isFood) toggleEquip(item);
                      }}
                      className={`relative w-full h-28 flex flex-col items-center justify-center p-3 rounded-lg border shadow text-lg transition ${equipped.includes(item)
                        ? "bg-yellow-200 border-yellow-500"
                        : "bg-gray-100 hover:bg-gray-200"
                        }`}
                    >
                      {item === "Ball Toy" && "⚽"}
                      {item === "Fancy Hat" && "🎩"}
                      {isFood && "🍖"}
                      <div className="text-xs mt-1 text-gray-600">{item}</div>
                      {count > 1 && (
                        <span className="absolute top-1 right-1 bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full shadow">
                          x{count}
                        </span>
                      )}
                    </button>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        <button
          onClick={handleClearInventory}
          className="bg-red-400 hover:bg-red-500 text-white px-4 py-2 rounded-lg shadow"
        >
          Clear Inventory
        </button>

        <button
          onClick={handleChangePet}
          className="bg-blue-400 hover:bg-blue-500 text-white px-4 py-2 rounded-lg shadow"
        >
          Change Pet
        </button>

        <button
          onClick={() => navigate("/map")}
          className="bg-yellow-400 hover:bg-yellow-500 px-5 py-2 rounded-lg font-medium shadow"
        >
          Back to Game
        </button>

        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="bg-gray-300 hover:bg-gray-400 px-5 py-2 rounded-lg font-medium shadow"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
