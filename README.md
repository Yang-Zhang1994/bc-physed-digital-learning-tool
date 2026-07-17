# BC PhysEd Digital Learning Tool

A gamified digital learning platform for BC Physical Education, featuring interactive modules, virtual pet system, and comprehensive teacher dashboard.

## Live demo

| | Link |
| --- | --- |
| **Website** | https://bc-physed.vercel.app |
| **API** | https://bc-physed-api.onrender.com |

> [!NOTE]
> **The first visit may take 30–60 seconds.** The free-tier Render API sleeps after
> inactivity. BC PhysEd shows a startup banner and retries `/health` automatically;
> if startup takes longer, use the **Try again** button. You can also open
> https://bc-physed-api.onrender.com/health once first.

Hosted on **Vercel** (client) and **Render** (API) with **MongoDB Atlas**.

**Try it (student path):** Register → choose pet → open a module on the map → walk into / click a panda → answer the question.  
**Teacher path:** Register with teacher role → `/teacher` dashboard → CSV export.

Deployment notes: **[docs/deployment.md](docs/deployment.md)**. Seed content: `cd server && npm run seed` (requires `MONGO_URI`).

## 🎯 Features

### For Students
- 🎮 **Gamification System**: Earn coins, level up your pet, and collect badges
- 📚 **Interactive Learning Modules**: Multiple question types (multiple choice, matching, short answer)
- 🐾 **Virtual Pet System**: Choose and care for your pet with items from the store
- 📊 **Progress Tracking**: Monitor your learning progress and achievements
- 🏆 **Level System**: Level up by completing modules

### For Teachers
- 👨‍🏫 **Student Dashboard**: View all students' progress and statistics
- 📈 **Detailed Analytics**: Track correct/incorrect answers, module completion
- 📥 **CSV Export**: Download student reports for analysis
- 🔍 **Individual Student View**: Deep dive into each student's performance

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication
- **PixiJS** for game graphics and animations
- **Framer Motion** for animations

### Backend
- **Node.js** with **Express 5**
- **TypeScript** for type safety
- **MongoDB** with **Mongoose** ODM
- **JWT** (JSON Web Tokens) for authentication
- **bcryptjs** for password hashing
- **CORS** enabled for cross-origin requests

## 📦 Installation

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas account)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Yang-Zhang1994/bc-physed-digital-learning-tool.git
   cd bc-physed-digital-learning-tool
   ```

2. **Install dependencies**

   Install server dependencies:
   ```bash
   cd server
   npm install
   ```

   Install client dependencies:
   ```bash
   cd ../client
   npm install
   ```

   Install root dependencies (if any):
   ```bash
   cd ..
   npm install
   ```

3. **Set up MongoDB**

   You have two options:

   **Option A: Use MongoDB Atlas**
   
   - No local installation needed
   - Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free account and cluster
   - Get your connection string from Atlas dashboard
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`

   **Option B: Use Local MongoDB**
   
    Install MongoDB on your computer:
   
    - **Windows**:
     1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
     2. Run the installer (.msi file)
     3. Choose "Complete" installation
     4. Select "Install MongoDB as a Service" (recommended)
     5. MongoDB will start automatically as a Windows service
     6. Verify installation by opening Command Prompt and running: `mongod --version`
   
    - **macOS**:
     brew tap mongodb/brew
     brew install mongodb-community
     brew services start mongodb-community

4. **Configure environment variables**

   Create `server/.env` file:
   ```env
   # For MongoDB Atlas (cloud):
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
   
   # Or for local MongoDB:
   # MONGO_URI=mongodb://localhost:27017/bc-physed-tool
   
   JWT_SECRET=your-secret-key-here-make-it-strong-and-random
   PORT=5000
   CLIENT_ORIGIN=http://localhost:5173
   ```

   **Important**: 
   - Replace `username`, `password`, and `cluster.mongodb.net` with your actual Atlas credentials
   - Or use `localhost:27017` if using local MongoDB
   - Replace `your-secret-key-here` with a strong random string for production

5. **Start the development servers**

   **Terminal 1 - Start backend server:**
   ```bash
   cd server
   npm run dev
   ```
   Server will run on `http://localhost:5000`

   **Terminal 2 - Start frontend client:**
   ```bash
   cd client
   npm run dev
   ```
   Client will run on `http://localhost:5173`

## 🚀 Usage

### For Students
1. Open `http://localhost:5173` in your browser
2. Register a new student account
3. Choose your pet (Dog or Cat)
4. Start learning modules from the game map
5. Answer questions to earn coins
6. Use coins to buy items from the store
7. Level up your pet by completing modules

### For Teachers
1. Register a teacher account
2. Access the teacher dashboard at `/teacher`
3. View all students' progress and statistics
4. Click on a student to see detailed information
5. Export student data as CSV reports

## 📁 Project Structure

```
bc-physed-digital-learning-tool/
├── client/                    # React frontend application
│   ├── src/
│   │   ├── pages/            # Page components (Login, GameMap, ModulePage, etc.)
│   │   ├── components/       # Reusable components (Pet, ModuleIcon, ProtectedRoute)
│   │   ├── context/          # React context providers (Auth, Pet)
│   │   ├── api/              # API client configuration
│   │   └── data/             # Mock data and modules
│   └── public/               # Static assets (images, gifs)
├── server/                   # Express backend application
│   ├── src/
│   │   ├── routes/           # API route handlers
│   │   │   ├── authRoutes.ts
│   │   │   ├── petRoutes.ts
│   │   │   ├── progressRoutes.ts
│   │   │   ├── contentRoutes.ts
│   │   │   └── teacherRoutes.ts
│   │   ├── models/           # Mongoose models (User, Module, Question, etc.)
│   │   ├── middleware/       # Express middleware (auth.ts)
│   │   ├── config/           # Configuration files (db.ts)
│   │   └── utils/            # Utility functions (env.ts)
│   └── database/             # JSON data files
└── README.md
```

## 🔐 Authentication

- Users can register as either **students** or **teachers**
- Passwords are hashed using **bcryptjs**
- JWT tokens are used for session management
- Protected routes require authentication

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

### Content
- `GET /api/content/modules` - Get all modules
- `GET /api/content/modules/:id` - Get module by ID
- `GET /api/content/levels/:id` - Get level by ID

### Pet & Gamification
- `GET /api/pet` - Get pet data
- `POST /api/pet/choose` - Choose pet (first time only)
- `POST /api/pet/buy` - Buy items from store
- `POST /api/pet/feed` - Feed pet with food

### Progress
- `POST /api/progress/record` - Record question attempt
- `POST /api/progress/complete` - Mark module as complete

### Teacher
- `GET /api/teacher/students` - Get all students with statistics
- `GET /api/teacher/students/:id` - Get detailed student information
- `GET /api/teacher/report.csv` - Export all students CSV
- `GET /api/teacher/students/:id/report.csv` - Export individual student CSV

## 🎮 Gamification System

### Coins
- Earned by answering questions correctly
- Can be spent in the store to buy items
- Stored in both top-level and nested data fields for compatibility

### Levels
- Increase when completing modules
- Each module completion = +1 level
- Pet grows stronger as level increases

### Badges
- Infrastructure ready for badge system
- Can be awarded for various achievements

### Pet System
- Choose between Dog or Cat
- Feed pet to increase hunger
- Level up makes pet stronger
- Visual representation with animated GIFs

## 🐛 Troubleshooting

### MongoDB Connection Issues
- **Problem**: `querySrv ENOTFOUND` error
- **Solution**: 
  - Check your internet connection
  - Verify MongoDB Atlas connection string
  - Try using standard connection string instead of SRV format
  - Ensure MongoDB service is running (for local MongoDB)

### Port Already in Use
- **Problem**: Port 5000 or 5173 is already in use
- **Solution**: 
  - Change `PORT` in `server/.env` for backend
  - Update `CLIENT_ORIGIN` if you change backend port
  - Kill the process using the port: `lsof -ti:5000 | xargs kill`

### Environment Variables Not Loading
- **Problem**: `Missing env vars: MONGO_URI or JWT_SECRET`
- **Solution**: 
  - Ensure `server/.env` file exists
  - Check that `.env` file is in the `server/` directory
  - Verify all required variables are set

### Module Not Found Errors
- **Problem**: `Cannot find module` errors
- **Solution**: 
  - Run `npm install` in both `server/` and `client/` directories
  - Delete `node_modules` and `package-lock.json`, then reinstall

## 📝 Development

### Build for Production

**Backend:**
```bash
cd server
npm run build
npm start
```

**Frontend:**
```bash
cd client
npm run build
```

### Code Style
- TypeScript for type safety
- ESLint for code linting
- Consistent code formatting

## 📄 License

ISC

## 👥 Contributors

- Yang Zhang
- Runyuan Feng
- Linhao Qian
- Shixing Mao

## 📧 Contact

- **Email**: sc20190702@gmail.com
- **GitHub Issues**: [Open an issue](https://github.com/Yang-Zhang1994/bc-physed-digital-learning-tool/issues)

---

**Note**: Make sure to set up your MongoDB connection string and JWT secret before running the application.
