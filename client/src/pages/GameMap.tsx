
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { usePet } from "../context/PetContext";
import { useAuth } from "../context/AuthContext";
import moduleContext from "../context/moduleContext";
import ColdStartWaitNote from "../components/ColdStartWaitNote";

type Module = {
  id: number;
  x: number;
  y: number;
  name: string;
  type?: "module" | "store" | "profile";
  radius?: number;
};

export default function GameMap() {
  const { pet, inventory } = usePet();
  const navigate = useNavigate();
  const { user } = useAuth();
  const storageKey = user ? `petPosition_${user.id}` : "petPosition_guest";

  const posRef = useRef({ x: 100, y: 200 });
  const keysRef = useRef<{ [key: string]: boolean }>({});

  const [pos, setPos] = useState(posRef.current);
  const [moving, setMoving] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [loading, setLoading] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState<string | null>(null);
  const [portalEnabled, setPortalEnabled] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  const BASE_WIDTH = 1440;
  const BASE_HEIGHT = 800;
  const [scale, setScale] = useState(1);

  const step = 200;
  const mapWidth = BASE_WIDTH;
  const mapHeight = BASE_HEIGHT;

  const initialModules: Module[] = [
    { id: 1, x: 390, y: 460, name: "Module 1", type: "module", radius: 80 },
    { id: 2, x: 860, y: 680, name: "Module 2", type: "module", radius: 80 },
    { id: 3, x: 1130, y: 550, name: "Module 3", type: "module", radius: 80 },
    { id: 99, x: 920, y: 200, name: "Pet Store", type: "store", radius: 120 },
    { id: 100, x: 1280, y: 760, name: "Profile", type: "profile", radius: 100 },
  ];

  const [modules, setModules] = useState<Module[]>(initialModules);

  // Fetch module information from backend and update local modules by id (1..3)
  useEffect(() => {
    let mounted = true;
    const fetchModules = async () => {
      try {
        const serverModules = await moduleContext.fetchModules();

        // Map server modules into local module entries (match by id/string equality)
        const updated = initialModules.map((m) => {
          // find a matching server module where any id-like field equals the local id
          const match = serverModules.find((sm: any) => {
            const candidates = [sm.moduleID, sm.moduleId, sm.id, sm._id];
            return candidates.some((c) => String(c) === String(m.id));
          });

          if (match) {
            return {
              ...m,
              name: match.moduleName ?? match.name ?? m.name,
              radius: match.radius ?? m.radius,
              type: (match.type as any) ?? m.type,
            };
          }

          return m;
        });

        if (mounted) setModules(updated);
      } catch (err) {
        console.error('Error loading modules', err);
      }
    };

    fetchModules();
    return () => {
      mounted = false;
    };
  }, []);

  // 🧭 Load saved position
  useEffect(() => {
    const updateScale = () => {
      const s = Math.min(window.innerWidth / BASE_WIDTH, window.innerHeight / BASE_HEIGHT);
      setScale(s);
    };
    updateScale();
    window.addEventListener("resize", updateScale);

    const savedPos = localStorage.getItem(storageKey);
    let newPos = { x: 100, y: 200 };

    if (savedPos) {
      let { x, y } = JSON.parse(savedPos);
      const insideModule = modules.find((m) => {
        const dx = m.x - x;
        const dy = m.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (m.radius ?? 80);
      });
      if (insideModule) {
        x += 100;
        y += 100;
      }
      newPos = { x, y };
    }

    posRef.current = newPos;
    setPos(newPos);

    const timer = setTimeout(() => setPortalEnabled(true), 2000);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  // --- Keyboard handling ---
  useEffect(() => {
    const validKeys = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (validKeys.includes(key)) {
        keysRef.current[key] = true;
        setMoving(true);

        if (key === "a" || key === "arrowleft") setDirection("left");
        if (key === "d" || key === "arrowright") setDirection("right");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (validKeys.includes(key)) {
        keysRef.current[key] = false;
        if (!Object.values(keysRef.current).some(Boolean)) setMoving(false);
      }
    };

    const handleBlur = () => {
      keysRef.current = {};
      setMoving(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // --- Movement loop ---
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();

    const move = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const keys = keysRef.current;
      let { x, y } = posRef.current;
      let dx = 0;
      let dy = 0;

      if (keys["w"] || keys["arrowup"]) dy -= 1;
      if (keys["s"] || keys["arrowdown"]) dy += 1;
      if (keys["a"] || keys["arrowleft"]) dx -= 1;
      if (keys["d"] || keys["arrowright"]) dx += 1;

      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      if (dx !== 0 || dy !== 0) {
        x = Math.min(Math.max(x + dx * step * dt, 0), mapWidth - 50);
        y = Math.min(Math.max(y + dy * step * dt, 0), mapHeight - 50);
        posRef.current = { x, y };
        setPos({ x, y });
        localStorage.setItem(storageKey, JSON.stringify({ x, y }));

        if (!hasMoved) setHasMoved(true);
      }

      animationFrame = requestAnimationFrame(move);
    };

    animationFrame = requestAnimationFrame(move);
    return () => cancelAnimationFrame(animationFrame);
  }, [hasMoved]);

  // --- Collision detection ---
  useEffect(() => {
    if (loading || !portalEnabled || !hasMoved) return;

    const { x, y } = pos;
    const collided = modules.find((m) => {
      const dx = m.x - x;
      const dy = m.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < (m.radius ?? 80);
    });

    if (collided) {
      setLoading(true);
      setPortalEnabled(false);
      setHasMoved(false);
      setLoadingTarget(collided.name);

      setTimeout(() => {
        if (collided.type === "store") navigate("/store");
        else if (collided.type === "profile") navigate("/profile");
        else navigate(`/module/${collided.id}`);
      }, 1000);
    }
  }, [pos, portalEnabled, hasMoved, loading]);

  const handleModuleClick = (m: Module) => {
    if (loading) return;
    if (m.type === "store") navigate("/store");
    else if (m.type === "profile") navigate("/profile");
    else navigate(`/module/${m.id}`);
  };

  // 🐾 Determine correct GIF based on pet, direction, and movement
  const petGif =
    pet === "Dog"
      ? moving
        ? direction === "left"
          ? "/pets/dog_walk_left.gif"
          : "/pets/dog_walk_right.gif"
        : "/pets/dog_idle.gif"
      : moving
        ? direction === "left"
          ? "/pets/cat_walk_left.gif"
          : "/pets/cat_walk_right.gif"
        : "/pets/cat_idle.gif";


  return (
    //     <div
    //       className="relative w-screen h-screen overflow-hidden"
    //       style={{
    //   backgroundImage: "url('/background.jpg')",
    //   backgroundSize: "100% 100%", // ✅ Stretches to viewport
    //   backgroundPosition: "center",
    //   backgroundRepeat: "no-repeat",
    // }}

    //     >
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        backgroundImage: "url('/background.gif')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#000",
      }}
    >

      <h1 className="absolute top-4 left-4 z-20 text-2xl font-extrabold text-white drop-shadow-lg">
        {pet ? `${pet}'s Park Adventure` : "Adventure Park"}
      </h1>

      {/* Scaled world container centers and fits to viewport */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* 🌍 Modules */}
        {modules.map((m) => {
        const distance = Math.hypot(m.x - pos.x, m.y - pos.y);
        const showName = distance < ((m.radius ?? 80) + 60);

        return (
          <div
            key={m.id}
            className="absolute flex flex-col items-center justify-center cursor-pointer"
            style={{ left: m.x, top: m.y, transform: "translate(-50%, -50%)" }}
            onClick={() => handleModuleClick(m)}
          >
            <motion.img
              src={
                m.type === "store"
                  ? "/icons/store.png"
                  : m.type === "profile"
                    ? pet === "Cat"
                      ? "/icons/cat_house.png"
                      : pet === "Dog"
                        ? "/icons/dog_house.gif"
                        : "/icons/default_house.gif"
                    : "/icons/module.gif"
              }
              alt={m.name}
              className="w-28 h-28 object-contain drop-shadow-xl"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            />
            {/* name badge: blurred background, appears only when player is close */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={showName ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className="mt-1"
              style={{ pointerEvents: 'none' }}
            >
              <div className="px-3 py-1 rounded-md bg-white/70 backdrop-blur-sm shadow-sm">
                <p className="text-sm font-semibold text-gray-800">{m.name}</p>
              </div>
            </motion.div>
          </div>
        )
      })}

        {/* 🐾 Pet + Accessories */}
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y,
            width: "80px",
            height: "80px",
            transform: "translate(-50%, -50%)",
          }}
        >
          {/* 🐾 Pet */}
          <motion.img
            key={`${pet}-${direction}-${moving}`}
            src={petGif}
            alt="pet"
            animate={moving ? { y: [0, -4, 0] } : { y: 0 }}
            transition={{
              repeat: moving ? Infinity : 0,
              duration: moving ? 0.6 : 0.3,
              ease: "easeInOut",
            }}
            className="w-full h-full object-contain select-none drop-shadow-lg"
            draggable={false}
          />

          {/* 🎩 Accessories */}
          {inventory.includes("Fancy Hat") && (
            <div
              className={`absolute ${pet === "Dog" ? "-top-1" : "-top-8"
                } ${moving
                  ? direction === "left"
                    ? "left-[35%]"
                    : "left-[70%]"
                  : "left-[58%]"
                } -translate-x-1/2 text-3xl select-none transition-all duration-150`}
            >
              🎩
            </div>
          )}

          {inventory.includes("Ball Toy") && (
            <div className="absolute bottom-0 right-0 text-2xl select-none">⚽</div>
          )}
          {inventory.includes("Pet Food") && (
            <div className="absolute bottom-[-20px] left-1 text-xl opacity-80 select-none">🍖</div>
          )}
        </div>
      </div>

      {/* ⚡ Portal Loading Transition */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 z-50 px-6 text-center"
          >
            <div className="flex items-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="w-16 h-16 border-4 border-t-transparent border-white rounded-full"
              />
              <p className="text-white text-xl ml-4 font-semibold">
                Entering {loadingTarget || "..."}...
              </p>
            </div>
            <ColdStartWaitNote className="text-slate-200 max-w-md" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
