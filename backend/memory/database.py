import sqlite3
import os

class MemoryDB:
    def __init__(self):
        # Store database in the backend directory
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(base_dir, "aria_memory.db")
        
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.create_tables()

    def create_tables(self):
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT,
                content TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        self.conn.commit()

    def add_message(self, role, content):
        cursor = self.conn.cursor()
        cursor.execute('INSERT INTO conversation (role, content) VALUES (?, ?)', (role, content))
        self.conn.commit()

    def get_recent_messages(self, limit=10):
        cursor = self.conn.cursor()
        # Fetch the last N messages in descending order (newest first)
        cursor.execute('''
            SELECT role, content FROM conversation 
            ORDER BY id DESC LIMIT ?
        ''', (limit,))
        rows = cursor.fetchall()
        
        # Reverse to chronological order (oldest first)
        return [{"role": row[0], "content": row[1]} for row in reversed(rows)]
