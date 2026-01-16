// src/pages/PetStorePage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePet } from "../context/PetContext";

type Item = { id: number; name: string; price: number; emoji: string };

export default function PetStorePage() {
  const navigate = useNavigate();
  const { pet, inventory, addItem, coins, refreshPetData } = usePet();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // refresh pet data when entering the store page
    (async () => {
      try {
        await refreshPetData();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('PetStorePage: refreshPetData failed', e);
      }
    })();
  }, [refreshPetData]);

  const items: Item[] = [
    { id: 1, name: "Ball Toy", price: 20, emoji: "⚽" },
    { id: 2, name: "Pet Food", price: 10, emoji: "🍖" },
    { id: 3, name: "Fancy Hat", price: 40, emoji: "🎩" },
  ];

  const foodCount = inventory.filter((i) => i === "Pet Food").length;

  const buyItem = async (item: Item) => {
    // allow buying multiple Pet Food items; for equipables, prevent duplicates
    if (item.name !== "Pet Food" && inventory.includes(item.name)) {
      // show inline message for consistency
      setSuccessMsg(`You already own the ${item.name}!`);
      return;
    }

    try {
      await addItem(item.name, item.price); // backend handles coins/inventory
      await refreshPetData(); // update after purchase
      setSuccessMsg(`You bought ${item.name} for ${item.price} coins!`);
      // auto-dismiss after 3.5s
      window.setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      const msg = err?.response?.data?.msg || "Something went wrong 🥲";
      setSuccessMsg(msg);
      window.setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-gradient-to-br from-pink-100 via-rose-50 to-amber-100 flex flex-col items-center">
      <h1 className="text-3xl font-bold mt-8 text-gray-800">
        🛍️ {pet || "Your Pet"}’s Store
      </h1>

      {/* Floating success/info toast (hover style) - does not reflow the page */}
      {successMsg && (
        <div className="fixed top-20 right-6 z-50">
          <div className="group relative">
            <div className="bg-emerald-500 text-white px-5 py-2 rounded-full shadow-lg font-semibold whitespace-nowrap">
              {successMsg}
            </div>
            {/* small hover helper: on hover, show a subtle pointer badge */}
            <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-3 h-3 bg-emerald-500 rotate-45 transform origin-center"></div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 bg-yellow-200 text-gray-800 px-6 py-2 rounded-full shadow-md font-semibold">
        💰 Coins: {coins}
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {items.map((item) => {
          // food can be purchased multiple times; other items are unique
          const owned = item.name !== "Pet Food" && inventory.includes(item.name);
          const canAfford = coins >= item.price;
          return (
            <div
              key={item.id}
              className="bg-white/80 p-4 rounded-2xl shadow-lg border border-pink-200 flex flex-col items-center"
            >
              <span className="text-3xl">{item.emoji}</span>
              <p className="font-semibold mt-2">{item.name}</p>
              <p className="text-sm text-gray-500 mb-2">{item.price} coins</p>
              {item.name === "Pet Food" && (
                <p className="text-xs text-gray-600">You own: {foodCount}</p>
              )}
              <button
                onClick={() => buyItem(item)}
                className={`mt-3 px-4 py-1 rounded-md text-white font-medium transition ${owned
                  ? "bg-green-400 cursor-not-allowed"
                  : !canAfford
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-pink-400 hover:bg-pink-500"
                  }`}
                disabled={owned || !canAfford}
              >
                {owned ? "Owned" : "Buy"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-10">
        <button
          onClick={() => navigate("/map")}
          className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold px-6 py-2 rounded-lg transition"
        >
          Back to Map
        </button>
      </div>
    </div>
  );
}
