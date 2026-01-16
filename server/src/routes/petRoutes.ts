import { Router } from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { User } from "../models/user";

const router = Router();

// 🐾 Get current pet data
router.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ msg: "User not found" });

  // return nested pet state if present so clients can read hunger/clean/happiness
  const nestedState = (user.data && (user.data as any).state) ? (user.data as any).state : undefined;

  res.json({
    pet: user.pet,
    coins: user.coins,
    inventory: user.inventory,
    petLevel: user.petLevel,
    state: nestedState,
  });
});

// 🐶 Choose pet (only once)
router.post("/choose", requireAuth, async (req: AuthedRequest, res) => {
  const { pet } = req.body;
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ msg: "User not found" });

  if (user.pet) return res.status(400).json({ msg: "Pet already chosen" });
  user.pet = pet;
  await user.save();

  res.json({ msg: "Pet selected", pet: user.pet });
});

// 💰 Buy item
router.post("/buy", requireAuth, async (req: AuthedRequest, res) => {
  const { item, cost } = req.body;
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ msg: "User not found" });

  if (user.coins < cost)
    return res.status(400).json({ msg: "Not enough coins" });
  // allow buying multiple "Pet Food" items, but keep unique restriction for equipables
  if (item !== "Pet Food" && user.inventory.includes(item))
    return res.status(400).json({ msg: "Item already owned" });

  // Sync data.coins with user.coins if it doesn't exist, then subtract cost from both
  const data: any = user.data ?? {};
  data.coins = (data.coins ?? user.coins) - cost;
  user.set("data", data);
  user.coins -= cost;
  user.inventory.push(item);
  await user.save();

  res.json({ coins: user.coins, inventory: user.inventory });
});

router.post("/clear-inventory", requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ msg: "User not found" });

  user.inventory = [];
  await user.save();

  res.json({ msg: "Inventory cleared", inventory: [] });
});

router.post("/change-pet", requireAuth, async (req: AuthedRequest, res) => {
  const { pet } = req.body;
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ msg: "User not found" });

  user.pet = pet;
  await user.save();

  res.json({ msg: "Pet changed", pet });
});
// 🍖 Feed pet (consume ONE food)
router.post("/feed", requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ msg: "User not found" });

  // amount to increase hunger by (client can pass e.g. 25)
  const { amount } = req.body || {};
  const inc = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 25;

  // find first food item
  const foodIndex = user.inventory.findIndex((i) => i === "Pet Food");

  if (foodIndex === -1) {
    return res.status(400).json({ msg: "You have no food to feed!" });
  }

  // remove *one* food
  user.inventory.splice(foodIndex, 1);

  // update nested pet hunger if present
  const data: any = user.data ?? {};
  data.state = data.state ?? {};
  const curHunger = typeof data.state.hunger === 'number' ? data.state.hunger : 0;
  // increase hunger by requested amount, clamp to 100
  data.state.hunger = Math.min(100, curHunger + inc);
  user.set('data', data);

  await user.save();

  res.json({
    msg: "Pet fed!",
    inventory: user.inventory, // updated inventory
    state: data.state,
    amount: inc,
  });
});


export default router;
