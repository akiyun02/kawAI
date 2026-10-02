# SIGNQUEST
### *Learn. Sign. Level Up.*
*Built for the RAITE 2026 AI in Education Hackathon*

---

## 🌟 Overview
**SIGNQUEST** is an AI-powered, gamified sign-language learning platform that uses real-time computer vision through the student's webcam to evaluate hand signs. 

Instead of a binary "correct / wrong" quiz, SIGNQUEST decomposes sign kinematics into **three biomechanical pillars**:
1. **Hand Shape** (Finger curl, extension, isolation, thumb abduction)
2. **Hand Orientation** (3D Palm normal vector, wrist angle relative to viewer)
3. **Spatial Positioning & Framing** (Bounding box centering, height, motion)

This empowers the system to deliver personalized, encouraging feedback like:
> *"Your finger shape is spot on, but your palm orientation is rotated inward toward yourself. Turn your palm to squarely face the camera."*

---

## 🚀 Live Demo & Presentation Quickstart

### 1. Start Backend Server
```powershell
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/health`

### 2. Start Frontend Server
```powershell
cd frontend
npm install
npm run dev
```
- Open `http://127.0.0.1:5173` in your browser.

---

## 🎮 Game Modes

| Mode | Purpose | Mechanics |
| :--- | :--- | :--- |
| **1. Learn** | Foundational Sign Instruction | Target anatomical card, 3D hand visual, live webcam skeleton mesh, real-time diagnostic breakdown (Shape, Orientation, Position). |
| **2. Practice** | Adaptive Flashcards | Random signs tailored to student's current skill tier; tracks accuracy, reaction time, streaks, and confidence. |
| **3. Speed Run** | High-Pressure 30s Sprint | Rapid sign prompts under a 30s countdown; chain combos up to 5x for massive score bursts. |
| **4. Word Builder** | Sequential Fingerspelling | Move beyond single letters to construct full words (`HELLO`, `PEACE`, `POLITE PHRASE`); evaluates transitions. |
| **5. Sign Detective** | Forensic Mystery Investigation | Case #014: *The Library Secret*. Follow clues, replicate secret hand signs, collect evidence, and crack the mystery. |
| **6. Boss Battle** | End-of-Unit Climax | Face *The Silent Guardian*. Boss attacks dynamically adapt to your orientation weaknesses; defeat the boss for +1000 XP! |
| **7. Skill Tree** | RPG Progression Tree | Foundations $\to$ Alphabet $\to$ Numbers $\to$ Words $\to$ Phrases $\to$ Conversation. Track mastery stars. |
| **8. Teacher Portal** | Privacy-Conscious Class Analytics | Aggregate student telemetry, most difficult signs, common kinematic error charts, and AI Class Challenge launcher. |

---

## 🛡️ Hackathon Presenter's "Demo Mode"
SIGNQUEST includes a **fail-safe Presentation Mode** accessible via the top-right `[DEMO MODE]` toggle or `Alt + D`.

When presenting in environments with poor lighting, strict webcam permissions, or stage hardware:
1. Toggle **DEMO MODE**. The system switches to the mathematical 3D hand simulator.
2. The **Presenter Toolbar** appears at the bottom of the camera feed:
   - `[✓ Perfect Sign]` $\to$ Demonstrates instant recognition, +100 XP, and arpeggiated success chime.
   - `[⚠ Inward Palm (Orientation)]` $\to$ Demonstrates the AI identifying the specific biomechanical orientation flaw (*"Palm rotated inward toward yourself"*).
   - `[⚠ Curl Issue (Shape)]` $\to$ Demonstrates finger curvature diagnostic.
   - `[⚠ Off-Center]` $\to$ Demonstrates framing advice.

---

## 🔒 Responsible AI & Privacy Charter
- **100% Local CV Execution**: Webcam frames are evaluated in WebAssembly/WebGL using MediaPipe Hands in the client browser. No video is ever uploaded or recorded.
- **Deaf Inclusion**: Grounded in natural human language appreciation; rejects medical deficit models.
- **Accessibility Ready**: Built-in High Contrast mode, Large Readable Text toggle, and Web Audio synthesis (100% usable sound-free with screen-reader cues).

---

## 🏗️ Technical Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, MediaPipe Hands, Lucide Icons, Web Audio API.
- **Backend**: FastAPI, SQLite / SQLAlchemy, Pydantic, Python 3.13.
- **AI Architecture**: 3D Vector Geometry engine (normal cross-product + finger angle ratios) + Gemini API pedagogical synthesis.
