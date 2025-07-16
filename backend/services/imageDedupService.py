# pip install imagehash PyMuPDF
from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
# from pdf2image import convert_from_bytes
from PIL import Image
import imagehash
from dotenv import load_dotenv
import os
from supabase import create_client, Client
import fitz

load_dotenv(dotenv_path=".env.local")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase environment variables not loaded. Check .env.local path.")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

router = APIRouter()

POPPLER_PATH = r"C:\Program Files\poppler-24.08.0\Library\bin"  

@router.post('/check-duplicate')
async def check_duplicate(file: UploadFile = File(...)):
    # Check file type
    is_pdf = file.filename.endswith(".pdf") or file.content_type == "application/pdf"
    
    try:
        if is_pdf:
            contents = await file.read()
            doc = fitz.open(stream=contents, filetype="pdf")
            page = doc.load_page(0)
            pix = page.get_pixmap()
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        else:
            img = Image.open(file.file)
        
        img = img.convert("L").resize((256, 256))
        phash = str(imagehash.phash(img))
        
        response = supabase.table("listings").select("phash").eq("phash", phash).execute()
        is_duplicate = len(response.data or []) > 0

        return JSONResponse(content={"is_duplicate": is_duplicate, "phash": phash})
    
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})