from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

conversation_history = []
MAX_TURNS = 15

def get_response(user_input: str) -> str:
    global conversation_history

    conversation_history.append({"role": "user", "content": user_input})

    # Keep only last MAX_TURNS messages
    if len(conversation_history) > MAX_TURNS * 2:
        conversation_history = conversation_history[-MAX_TURNS * 2:]

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are JARVIS, a helpful, witty, and intelligent AI assistant. Keep responses concise and natural for voice output."},
            *conversation_history
        ],
        stream=False
    )

    reply = response.choices[0].message.content
    conversation_history.append({"role": "assistant", "content": reply})
    return reply