import os
import shutil
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from ai4bharat.transliteration import XlitEngine

# Initialize FastAPI app
app = FastAPI(title="Bharat Linguist API")

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. Configure Google Gemini API (For Translation) ---
API_KEY = os.environ.get("API_KEY")
if not API_KEY:
    print("WARNING: API_KEY environment variable is not set. Translation calls will fail.")
else:
    genai.configure(api_key=API_KEY)

# --- 2. Configure AI4Bharat Transliteration Engine (For IME) ---
# We initialize the engine for common Indian languages.
# This will download models on the first run (approx 100-200MB).
# Supported: Hindi (hi), Bengali (bn), Tamil (ta), Telugu (te), Marathi (mr),
# Gujarati (gu), Kannada (kn), Malayalam (ml), Punjabi (pa), Urdu (ur)
SUPPORTED_LANGS = ["hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "ur"]

print("Initializing Transliteration Engine... (This may take a moment)")
try:
    xlit_engine = XlitEngine(SUPPORTED_LANGS, beam_width=10)
    print("Transliteration Engine Ready.")
except Exception as e:
    print(f"Failed to initialize Transliteration Engine: {e}")
    xlit_engine = None

# --- Data Models ---

class TranslationRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

class TransliterationRequest(BaseModel):
    text: str
    target_lang_code: str  # e.g., 'hi', 'ta'

# --- Endpoints ---

@app.get("/")
async def root():
    return {"message": "Bharat Linguist Backend Ready"}

@app.post("/transliterate")
async def transliterate_text(request: TransliterationRequest):
    """
    Converts Roman text to Indic script phonetically.
    Example: "namaste" -> "नमस्ते" if target_lang_code is 'hi'.
    """
    if not xlit_engine:
        raise HTTPException(status_code=503, detail="Transliteration engine not initialized")
    
    if request.target_lang_code not in SUPPORTED_LANGS:
        # If language is not supported for transliteration, return original text
        return {"result": request.text}

    try:
        # translit_word returns a list of suggestions. We take the top one.
        # For sentences, simple word-by-word replacement or passing the full sentence depends on the lib version.
        # XlitEngine usually handles word-level best.
        
        # NOTE: ai4bharat-transliteration 1.1.3 typically handles words.
        # If the input contains spaces, we might need to split, but let's try passing the text.
        # The library output is a dictionary if multiple langs, or specific structure.
        
        output = xlit_engine.translit_sentence(request.text, lang_code=request.target_lang_code)
        
        return {"result": output}
        
    except Exception as e:
        print(f"Transliteration Error: {e}")
        return {"result": request.text} # Fallback to original text

@app.post("/translate/text")
async def translate_text(request: TranslationRequest):
    """
    Translates text using Google Gemini API.
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"You are a professional translator. Translate this text: '{request.text}' from {request.source_lang} to {request.target_lang}. Output ONLY the translated text."
        
        response = model.generate_content(prompt)
        translated_text = response.text.strip()
        
        return {
            "original_text": request.text,
            "translated_text": translated_text,
            "source_lang": request.source_lang,
            "target_lang": request.target_lang
        }
        
    except Exception as e:
        print(f"Translation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
