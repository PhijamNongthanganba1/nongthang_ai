import sqlite3
import os
from contextlib import contextmanager

DB_NAME = "users.db"

@contextmanager
def get_db():
    """Database connection context manager"""
    conn = sqlite3.connect(DB_NAME, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    """Initialize database with enhanced schema"""
    with get_db() as conn:
        c = conn.cursor()
        
        # Enhanced users table with quotas
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                email TEXT PRIMARY KEY,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                plan TEXT DEFAULT 'free',
                ai_credits INTEGER DEFAULT 100,
                images_generated INTEGER DEFAULT 0,
                videos_generated INTEGER DEFAULT 0,
                backgrounds_removed INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
        ''')
        
        # Designs table
        c.execute('''
            CREATE TABLE IF NOT EXISTS designs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT NOT NULL,
                name TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
            )
        ''')
        
        # Usage analytics table
        c.execute('''
            CREATE TABLE IF NOT EXISTS usage_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT NOT NULL,
                feature_type TEXT NOT NULL,
                credits_used INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_email) REFERENCES users (email)
            )
        ''')
        
        # Create indexes for better performance
        c.execute('CREATE INDEX IF NOT EXISTS idx_designs_user ON designs(user_email)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_analytics(user_email)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_analytics(created_at)')
        
        conn.commit()
    print(f"✅ Database {DB_NAME} initialized with multi-user schema!")