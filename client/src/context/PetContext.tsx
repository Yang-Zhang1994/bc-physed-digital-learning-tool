import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { api } from "../api/api"; // ✅ use configured axios instance

type PetContextType = {
  pet: string | null;
  petState?: { hunger: number; happiness: number; clean: number } | null;
  petLevel?: number;
  setPet: (pet: string) => Promise<void>;
  inventory: string[];
  addItem: (item: string, cost: number) => Promise<void>;
  coins: number;
  addCoins: (amount: number) => void;
  clearInventory: () => Promise<void>;   // ✅
  changePet: (newPet: string) => Promise<void>; // ✅
  refreshPetData: () => Promise<void>;
  feedPet: (amount?: number) => Promise<any>;
  setCoinsDirect: (value: number) => void;
  isLoading: boolean;
};

const PetContext = createContext<PetContextType | undefined>(undefined);

export const PetProvider = ({ children }: { children: ReactNode }) => {
  const [pet, setPetState] = useState<string | null>(null);
  const [petState, setPetStateNested] = useState<{ hunger: number; happiness: number; clean: number } | null>(null);
  const [petLevel, setPetLevel] = useState<number | undefined>(undefined);
  const [inventory, setInventory] = useState<string[]>([]);
  const [coins, setCoins] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // 🔹 Fetch pet data from backend
  const refreshPetData = useCallback(async () => {
    try {
      //setIsLoading(true);
      const { data } = await api.get("/api/pet"); // ✅ use api
      setPetState(data.pet);
      setInventory(data.inventory);
      setCoins(data.coins);
      setPetLevel(typeof data.petLevel === 'number' ? data.petLevel : undefined);
      // nested pet state (hunger/happiness/clean)
      if (data.state) {
        setPetStateNested({
          hunger: typeof data.state.hunger === 'number' ? data.state.hunger : 0,
          happiness: typeof data.state.happiness === 'number' ? data.state.happiness : 0,
          clean: typeof data.state.clean === 'number' ? data.state.clean : 0,
        });
      } else {
        setPetStateNested(null);
      }
    } catch (err) {
      console.warn("No pet data or user not logged in.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearInventory = useCallback(async () => {
    const { data } = await api.post("/api/pet/clear-inventory");
    setInventory(data.inventory);
  }, []);

  const changePet = useCallback(async (newPet: string) => {
    const { data } = await api.post("/api/pet/change-pet", { pet: newPet });
    setPetState(data.pet);
  }, []);
  // 🔹 Choose new pet (only once)
  const setPet = useCallback(async (pet: string) => {
    const { data } = await api.post("/api/pet/choose", { pet }); // ✅ use api
    setPetState(data.pet);
  }, []);

  // 💰 Buy item from store
  const addItem = useCallback(async (item: string, cost: number) => {
    const { data } = await api.post("/api/pet/buy", { item, cost }); // ✅ use api
    setInventory(data.inventory);
    setCoins(data.coins);
  }, []);

  const feedPet = useCallback(async (amount: number = 25) => {
    const { data } = await api.post("/api/pet/feed", { amount });
    setInventory(data.inventory);
    if (data.state) {
      setPetStateNested({
        hunger: typeof data.state.hunger === 'number' ? data.state.hunger : 0,
        happiness: typeof data.state.happiness === 'number' ? data.state.happiness : 0,
        clean: typeof data.state.clean === 'number' ? data.state.clean : 0,
      });
    }
    return data;
  }, []);
  const setCoinsDirect = useCallback((value: number) => setCoins(value), []);


  const addCoins = useCallback((amount: number) => setCoins((c) => c + amount), []);

  useEffect(() => {
    refreshPetData();
  }, [refreshPetData]);

  const value = useMemo(
    () => ({
      pet,
      petState,
      petLevel,
      setPet,
      inventory,
      addItem,
      coins,
      addCoins,
      refreshPetData,
      clearInventory,
      changePet,
      feedPet,
      setCoinsDirect,
      isLoading,
    }),
    [
      pet,
      petState,
      inventory,
      coins,
      addItem,
      addCoins,
      refreshPetData,
      clearInventory,
      changePet,
      feedPet,
      setCoinsDirect,
      isLoading,
      setPet,
    ]
  );

  return (
    <PetContext.Provider value={value}>{children}</PetContext.Provider>
  );
};

export const usePet = () => {
  const context = useContext(PetContext);
  if (!context) throw new Error("usePet must be used within PetProvider");
  return context;
};
