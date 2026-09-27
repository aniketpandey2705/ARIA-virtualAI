from brain.llm import LanguageModel
from memory.database import MemoryDB
from vision.vision_context import VisionContextManager
import os

class ConversationManager:
    def __init__(self):
        print("Loading Conversation Manager & Memory DB...")
        self.db = MemoryDB()
        self.llm = LanguageModel(model_name="llava")
        self.vision = VisionContextManager()
        
    def process_user_input(self, text):
        image_path = None
        
        # 1. Check for Vision Intent (Screen Analysis)
        if self.vision.needs_screen_analysis(text):
            image_path = self.vision.capture_screen_for_llm()
            print("[👁️ Looking at Screen (Llava)...]")

        # 2. Build the current user message
        msg = {"role": "user", "content": text}
        if image_path:
            msg["images"] = [image_path]

        # Save to SQLite (we only save the text to memory for now, to avoid bloating the DB)
        self.db.add_message("user", text)

        # 3. Retrieve the recent conversation history (last 10 turns)
        history = self.db.get_recent_messages(limit=10)
        
        # Overwrite the very last user message in the list with our rich message (which contains the image)
        if len(history) > 0 and history[-1]["role"] == "user":
            history[-1] = msg
        else:
            history.append(msg)
        
        # 4. Generate response using the unified LLM (Llava)
        response = self.llm.generate_response_with_history(history)
        
        # Clean up screenshot if we took one
        if image_path and os.path.exists(image_path):
            try:
                os.remove(image_path)
            except:
                pass
        
        # 5. Save ARIA's response to database
        self.db.add_message("assistant", response)
        
        return response
