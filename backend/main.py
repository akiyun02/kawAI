"""
SIGNQUEST Backend API Server
FastAPI server exposing endpoints for student progress, CV attempt evaluation logging,
AI personalization feedback, and teacher classroom insights.
"""

import os
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import SignAttemptCreate, StudentProfile, TeacherClassInsights, DB_PATH
import ai_engine

app = FastAPI(
    title="SIGNQUEST API",
    description="Backend services for SIGNQUEST AI Sign Language Education Platform",
    version="1.0.0"
)

# Enable CORS for local Vite dev server and production frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "SIGNQUEST AI Engine",
        "version": "1.0.0",
        "tagline": "Learn. Sign. Level Up."
    }

@app.get("/api/health")
def health():
    return {"status": "healthy"}

@app.get("/api/student/{student_id}", response_model=StudentProfile)
def get_student(student_id: str):
    profile = ai_engine.get_student_analytics(student_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    return profile

@app.post("/api/attempt")
def record_attempt(attempt: SignAttemptCreate):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Insert attempt record
    cursor.execute("""
    INSERT INTO attempts (
        student_id, sign_id, mode, is_correct, confidence,
        shape_score, orientation_score, position_score, latency_ms, feedback
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        attempt.student_id, attempt.sign_id, attempt.mode,
        1 if attempt.is_correct else 0, attempt.confidence,
        attempt.shape_score, attempt.orientation_score, attempt.position_score,
        attempt.latency_ms, attempt.feedback
    ))
    
    # Update student XP and streak if correct
    xp_gain = 0
    if attempt.is_correct:
        xp_gain = 100
        if attempt.latency_ms < 1500:
            xp_gain += 30  # Speed bonus
            
        cursor.execute("UPDATE students SET xp = xp + ? WHERE id = ?", (xp_gain, attempt.student_id))
        # Check level up (every 500 XP)
        cursor.execute("SELECT xp, level FROM students WHERE id = ?", (attempt.student_id,))
        row = cursor.fetchone()
        if row:
            curr_xp, curr_lvl = row
            new_lvl = (curr_xp // 500) + 1
            if new_lvl > curr_lvl:
                cursor.execute("UPDATE students SET level = ? WHERE id = ?", (new_lvl, attempt.student_id))
                
    conn.commit()
    conn.close()
    
    # Fetch updated analytics
    updated_profile = ai_engine.get_student_analytics(attempt.student_id)
    
    return {
        "status": "recorded",
        "xp_gained": xp_gain,
        "is_correct": attempt.is_correct,
        "updated_profile": updated_profile
    }

@app.get("/api/teacher/insights", response_model=TeacherClassInsights)
def get_teacher_insights():
    return ai_engine.get_teacher_insights()

@app.post("/api/teacher/start-challenge")
def start_teacher_challenge():
    return {
        "status": "challenge_broadcasted",
        "title": "3D Palm Orientation Synchronous Drill",
        "description": "Sent to all 24 connected students in Classroom A-1",
        "target_signs": ["B", "D", "HELLO", "THANK YOU"],
        "reward_xp": 200
    }

@app.get("/api/quests")
def get_quests():
    return [
        {
            "id": "quest-1",
            "title": "Master Everyday Greetings",
            "description": "Successfully perform HELLO and THANK YOU with >= 85% orientation accuracy.",
            "progress": 70,
            "target": 100,
            "reward_xp": 250,
            "category": "Everyday Signs",
            "completed": False
        },
        {
            "id": "quest-2",
            "title": "Clean Palm Calibration",
            "description": "Perform signs B and D with palm facing straight ahead for 3 consecutive reps.",
            "progress": 33,
            "target": 100,
            "reward_xp": 300,
            "category": "Biomechanical Focus",
            "completed": False
        },
        {
            "id": "quest-3",
            "title": "Speed Runner",
            "description": "Achieve a 5x combo multiplier in Speed Run mode.",
            "progress": 80,
            "target": 100,
            "reward_xp": 400,
            "category": "Speed Run",
            "completed": False
        }
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
