"""
SignQuest Backend: Models, Database, and Seed Data
Provides persistent learner performance tracking, sign dictionary,
AI personalization engine, and teacher classroom analytics.
"""

import json
import os
import sqlite3
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

DB_PATH = os.path.join(os.path.dirname(__file__), "signquest.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Students profile
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        streak INTEGER DEFAULT 1,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        settings TEXT
    )
    """)

    # Attempts & Performance Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        sign_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        confidence REAL,
        shape_score REAL,
        orientation_score REAL,
        position_score REAL,
        latency_ms INTEGER,
        feedback TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Quests
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quests (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        target_count INTEGER NOT NULL,
        category TEXT NOT NULL,
        xp_reward INTEGER NOT NULL
    )
    """)

    # Seed initial demo student if not present
    cursor.execute("SELECT COUNT(*) FROM students WHERE id = 'student-alex'")
    if cursor.fetchone()[0] == 0:
        initial_settings = json.dumps({
            "high_contrast": False,
            "large_text": False,
            "sound_enabled": True,
            "keyboard_hints": True
        })
        cursor.execute("""
        INSERT INTO students (id, name, avatar, level, xp, streak, settings)
        VALUES ('student-alex', 'Alex Rivers', 'student', 4, 1850, 5, ?)
        """, (initial_settings,))
        
        # Seed realistic attempts showing typical learner progression with orientation struggle
        sample_attempts = [
            ('student-alex', 'A', 'learn', 1, 0.94, 0.95, 0.92, 0.96, 1200, "Excellent hand shape and orientation!"),
            ('student-alex', 'B', 'learn', 0, 0.62, 0.88, 0.45, 0.89, 2100, "Good finger shape, but your palm orientation is rotated inward."),
            ('student-alex', 'B', 'practice', 1, 0.88, 0.92, 0.85, 0.91, 1500, "Great palm orientation adjustment!"),
            ('student-alex', 'C', 'learn', 1, 0.91, 0.93, 0.90, 0.92, 1100, "Smooth curve on the fingers!"),
            ('student-alex', 'D', 'practice', 0, 0.58, 0.82, 0.40, 0.85, 2400, "Keep index finger pointing upward and turn palm toward the camera."),
            ('student-alex', 'HELLO', 'learn', 1, 0.89, 0.90, 0.88, 0.93, 1400, "Clear greeting wave motion!"),
            ('student-alex', 'THANK YOU', 'learn', 1, 0.87, 0.89, 0.86, 0.88, 1600, "Respectful and smooth release from chin!"),
            ('student-alex', 'YES', 'practice', 1, 0.95, 0.96, 0.94, 0.95, 950, "Firm, confident nodding fist!"),
            ('student-alex', 'NO', 'practice', 0, 0.64, 0.60, 0.70, 0.85, 2300, "Pinch index and middle to thumb smoothly.")
        ]
        
        for sa in sample_attempts:
            cursor.execute("""
            INSERT INTO attempts (student_id, sign_id, mode, is_correct, confidence, shape_score, orientation_score, position_score, latency_ms, feedback)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, sa)

    # Seed mock classroom data for Teacher Dashboard
    mock_students = [
        ('student-maya', 'Maya Lin', 'student2', 6, 2840, 7),
        ('student-jordan', 'Jordan Taylor', 'student3', 3, 1320, 3),
        ('student-sam', 'Sam Patel', 'student4', 5, 2210, 6),
        ('student-elena', 'Elena Rossi', 'student5', 2, 750, 2),
        ('student-leo', 'Leo Kim', 'student6', 7, 3450, 9)
    ]
    for s_id, s_name, s_av, s_lvl, s_xp, s_strk in mock_students:
        cursor.execute("SELECT COUNT(*) FROM students WHERE id = ?", (s_id,))
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
            INSERT INTO students (id, name, avatar, level, xp, streak, settings)
            VALUES (?, ?, ?, ?, ?, ?, '{}')
            """, (s_id, s_name, s_av, s_lvl, s_xp, s_strk))
            
            # Seed attempts with interesting patterns for teacher analytics
            cursor.execute("""
            INSERT INTO attempts (student_id, sign_id, mode, is_correct, confidence, shape_score, orientation_score, position_score, latency_ms, feedback)
            VALUES (?, 'B', 'practice', 0, 0.55, 0.85, 0.42, 0.90, 2500, 'Orientation error')
            """, (s_id,))
            cursor.execute("""
            INSERT INTO attempts (student_id, sign_id, mode, is_correct, confidence, shape_score, orientation_score, position_score, latency_ms, feedback)
            VALUES (?, 'D', 'practice', 0, 0.58, 0.80, 0.48, 0.88, 2200, 'Orientation error')
            """, (s_id,))

    conn.commit()
    conn.close()

init_db()

# Pydantic Schemas
class SignAttemptCreate(BaseModel):
    student_id: str = "student-alex"
    sign_id: str
    mode: str = "learn"
    is_correct: bool
    confidence: float
    shape_score: float
    orientation_score: float
    position_score: float
    latency_ms: int = 1500
    feedback: str = ""

class StudentProfile(BaseModel):
    id: str
    name: str
    avatar: str
    level: int
    xp: int
    xp_to_next: int
    streak: int
    alphabet_mastery: int
    numbers_mastery: int
    common_signs_mastery: int
    orientation_accuracy: int
    shape_accuracy: int
    total_attempts: int
    accuracy_rate: int
    weaknesses: List[str]
    ai_recommendation: Dict[str, Any]

class TeacherClassInsights(BaseModel):
    active_students_count: int
    average_mastery_pct: int
    average_streak_days: float
    most_difficult_signs: List[Dict[str, Any]]
    common_mistake_breakdown: List[Dict[str, Any]]
    students_needing_support: List[Dict[str, Any]]
    ai_class_insight: str
    recommended_activity: str
    challenge_ready: bool
