import ollama

class LanguageModel:
    def __init__(self, model_name="llava"):
        # We use LLaVA (Large Language-and-Vision Assistant) as the unified brain.
        # It handles both conversational text and native screen vision simultaneously.
        self.model_name = model_name
        print(f"LanguageModel initialized with {model_name}.")

    def generate_response_with_history(self, history):
        try:
            system_prompt = (
                "You are ARIA, a highly intelligent AI assistant. "
                "You can see the user's screen when an image is provided in the chat. "
                "Answer the user's questions based on the visual context and your knowledge. "
                "Do not be robotic. Speak naturally and briefly.\n\n"
                "IMPORTANT: You MUST use expressive tags in your responses to sound more human! "
                "Available tags: [laugh], [sigh], [cough], [chuckle], [clear_throat], [breath]. "
                "Example: 'Well, [laugh] I suppose that makes sense.' or '[sigh] Let me check on that.'"
            )
            
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(history)
            
            response = ollama.chat(model=self.model_name, messages=messages)
            return response['message']['content'].strip()
        except Exception as e:
            print(f"LLM Error: {e}")
            return "I'm having trouble connecting to my brain."
