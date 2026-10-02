# KawAI Architecture & Design Specification
**EMPOWERED BY AI • Learn. Sign. Level Up.**  
*RAITE 2026 AI in Education Hackathon Prototype*

---

## 1. Executive Summary & Core Philosophy
KawAI is an AI-powered sign language education platform that unites browser-based computer vision hand tracking with RPG progression mechanics and pedagogical AI personalization.

Unlike traditional static quizzes or basic classifiers that simply emit "Wrong", KawAI deconstructs sign mechanics into three physical pillars:
1. **Hand Shape** (Finger curl, extension, thumb abduction)
2. **Hand Orientation** (3D Palm normal vector, wrist angle relative to camera)
3. **Spatial Position & Trajectory** (Framing within video viewport, dynamic motion)

This empowers the system to give nuanced, respectful, and actionable educational feedback:
> *"Your finger shape is close to 'B', but your palm is rotated 45° inward. Turn your palm to face directly toward the camera."*

---

## 2. System Architecture

```
+--------------------------------------------------------------------------+
|                                FRONTEND                                  |
|   (Vite + React 19 + TypeScript + Tailwind CSS + Canvas 2D + Lucide)     |
|                                                                          |
|  +--------------------+  +----------------------+  +------------------+  |
|  |   Video Stream     |  |   Landmark Engine    |  |  Sign Evaluator  |  |
|  | (Webcam / Demo Sim)|->| (MediaPipe Hands CV) |->| (Vector Geometry)|  |
|  +--------------------+  +----------------------+  +------------------+  |
|                                                              |           |
|                                                              v           |
|  +--------------------+  +----------------------+  +------------------+  |
|  | Game State Machine |  | Audio / VFX System   |  | Real-time Feedback| |
|  | (XP, Combo, Boss)  |<-| (Web Audio + Canvas) |<-| (Shape/Orient/Pos)| |
|  +--------------------+  +----------------------+  +------------------+  |
+--------------------------------------------------------------------------+
                                     |
                          REST API / WebSocket
                                     v
+--------------------------------------------------------------------------+
|                                BACKEND                                   |
|             (FastAPI + SQLite / SQLAlchemy + Pydantic)                   |
|                                                                          |
|  +----------------------+  +--------------------+  +------------------+  |
|  | Student Profile API  |  | Teacher Analytics  |  | AI Coach Engine  |  |
|  | (Stats, XP, Weakness)|  | (Class Diagnostics)|  | (Gemini / Expert)| |
|  +----------------------+  +--------------------+  +------------------+  |
+--------------------------------------------------------------------------+
```

---

## 3. Computer Vision & Geometric Classifier Pipeline
To ensure high-fps, zero-latency feedback during live webcam interaction:
- **Landmark Extraction**: 21 3D landmarks $(x, y, z)$ tracked at 30-60 FPS using MediaPipe Hands in the browser.
- **Orientation Vector Calculation**:
  - Vector $A = \vec{P}_{\text{index\_mcp}} - \vec{P}_{\text{wrist}}$
  - Vector $B = \vec{P}_{\text{pinky\_mcp}} - \vec{P}_{\text{wrist}}$
  - Normal Vector $\vec{N} = A \times B$. The $z$-component determines whether the palm is facing toward the camera ($N_z < 0$), inward ($N_z > 0$), or side-facing ($|N_x| > |N_z|$).
- **Finger Curvature Metric**:
  - Distance ratio: $\frac{\|\vec{P}_{\text{tip}} - \vec{P}_{\text{wrist}}\|}{\|\vec{P}_{\text{mcp}} - \vec{P}_{\text{wrist}}\|}$
  - Angle between $(\vec{P}_{\text{pip}} - \vec{P}_{\text{mcp}})$ and $(\vec{P}_{\text{tip}} - \vec{P}_{\text{pip}})$.
- **Dynamic Movement Tracking**:
  - Rolling window buffer (15 frames) calculates velocity and trajectory for dynamic signs (e.g. "HELLO" wave, "THANK YOU" chin-to-forward release).

---

## 4. Game Modes Specification
1. **Learn Mode**:
   - Split view: Target anatomy guide with reference 3D hand visual + interactive webcam feed + real-time diagnostic panel (Shape, Orientation, Position).
2. **Practice Mode**:
   - Adaptive flashcard-style drill targeting weak signs with encouraging streak counters.
3. **Speed Run**:
   - 30-second adrenaline mode. Rapid signs, combo multipliers ($\times 1, \times 2, \times 3, \times 4$), time extensions, high-score leaderboard.
4. **Word Builder**:
   - Multi-letter / multi-sign sequence spelling (e.g., `H` $\to$ `E` $\to$ `L` $\to$ `L` $\to$ `O`). Evaluates sequence completion and sign transitions.
5. **Sign Detective**:
   - Mystery narrative with Case Files (e.g., Case #014: "The Silent Library Clue"). Students analyze suspects' secret signals, decode hand signs, and collect evidence.
6. **Boss Battle**:
   - Epic encounter with "The Silent Guardian". Boss attacks periodically; student deals damage by chaining correct signs. The Boss targets known student weaknesses (e.g. orientation drills).

---

## 5. AI Personalization & Learner Profiles
- Logs performance metrics per attempt: `sign_id`, `success`, `shape_score`, `orientation_score`, `position_score`, `latency_ms`.
- Computes student mastery matrix across:
  - Alphabet, Numbers, Everyday Signs, Hand Orientation accuracy.
- AI Pedagogical Agent (Gemini API with robust rule-based fallback) synthesizes tailored daily practice routines:
  > *"Your hand shapes are 89% accurate, but your palm orientation on 'B' and 'D' frequently faces inward. Let's do a 3-minute Palm Orientation Mastery Drill."*

---

## 6. Accessibility & Responsible AI
- **Full Sound-Free Experience**: Web Audio synthesis for pleasant feedback, but with 100% equivalent visual cues (haptic borders, screen-reader captions, iconography).
- **High-Contrast & Large-Text Modes**: Built-in visual toggles.
- **Privacy First**: All video processing executes strictly on client device; no video/images ever leave the user's browser. Only anonymous landmark metrics are analyzed.
- **Demo Mode**: Full hardware-independent simulation mode for rock-solid hackathon presentations.
