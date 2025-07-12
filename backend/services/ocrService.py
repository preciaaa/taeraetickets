import os
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from uuid import uuid4
from mistralai import Mistral
import requests
from io import BytesIO

# Load .env.local explicitly
load_dotenv(dotenv_path=".env.local")

# Load environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

# Validate env vars
if not SUPABASE_URL or not SUPABASE_KEY or not MISTRAL_API_KEY:
    raise RuntimeError("Missing one or more required environment variables.")

# Initialize app and Mistral client
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Mistral(api_key=MISTRAL_API_KEY)

# Use the name of your actual public bucket
BUCKET_NAME = "tickets"

# Function to check if bucket exists and create it if needed
def ensure_bucket_exists():
    try:
        # Check if bucket exists
        bucket_url = f"{SUPABASE_URL}/storage/v1/bucket/{BUCKET_NAME}"
        response = requests.get(
            bucket_url,
            headers={"Authorization": f"Bearer {SUPABASE_KEY}"}
        )
        
        if response.status_code == 404:
            # Create bucket if it doesn't exist
            create_response = requests.post(
                f"{SUPABASE_URL}/storage/v1/bucket",
                headers={
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "id": BUCKET_NAME,
                    "name": BUCKET_NAME,
                    "public": True
                }
            )
            if create_response.status_code in [200, 201]:
                print(f"Created bucket: {BUCKET_NAME}")
            else:
                print(f"Failed to create bucket: {create_response.status_code} - {create_response.text}")
        elif response.status_code == 200:
            print(f"Bucket {BUCKET_NAME} already exists")
        else:
            print(f"Error checking bucket: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"Error ensuring bucket exists: {e}")

# Ensure bucket exists on startup
ensure_bucket_exists()

@app.post("/extract-text/")
async def extract_text(file: UploadFile = File(...)):
    try:
        # 1. Validate PDF
        if not file.filename or not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")

        file_bytes = await file.read()
        file_name = f"{uuid4()}.pdf"

        # 2. Upload to Supabase Storage
        upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{file_name}"
        
        print(f"Uploading to: {upload_url}")
        print(f"Bucket: {BUCKET_NAME}")
        print(f"File size: {len(file_bytes)} bytes")
        
        response = requests.post(
            upload_url,
            headers={
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/pdf"
            },
            files={"file": (file_name, BytesIO(file_bytes), "application/pdf")}
        )

        print(f"Upload response status: {response.status_code}")
        print(f"Upload response: {response.text}")

        if response.status_code not in [200, 201]:
            error_detail = f"Failed to upload file to Supabase. Status: {response.status_code}, Response: {response.text}"
            raise HTTPException(status_code=500, detail=error_detail)

        # 3. Construct public URL manually
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{file_name}"

        # 4. Send to Mistral OCR
        ocr_response = client.ocr.process(
            model="mistral-ocr-latest",
            document={
                "type": "document_url",
                "document_url": public_url
            },
            include_image_base64=False
        )
        
        # Debug: Print OCR response structure
        print(f"OCR Response type: {type(ocr_response)}")
        print(f"OCR Response attributes: {dir(ocr_response)}")
        if hasattr(ocr_response, 'pages'):
            print(f"Number of pages: {len(ocr_response.pages)}")
            if ocr_response.pages:
                print(f"First page attributes: {dir(ocr_response.pages[0])}")

        # 5. Extract text from response
        # Based on debug output, OCR response has 'pages' with 'markdown' attribute
        if hasattr(ocr_response, 'pages') and ocr_response.pages:
            # Extract text from pages using markdown attribute
            page_texts = []
            for page in ocr_response.pages:
                if hasattr(page, 'markdown') and page.markdown:
                    page_texts.append(page.markdown)
            extracted_text = '\n'.join(page_texts) if page_texts else str(ocr_response)
        elif hasattr(ocr_response, 'text') and ocr_response.text:
            extracted_text = ocr_response.text
        elif hasattr(ocr_response, 'content') and ocr_response.content:
            extracted_text = ocr_response.content
        else:
            # Fallback to string representation
            extracted_text = str(ocr_response)

        return {
            "text": extracted_text,
            "is_scanned": getattr(ocr_response, 'is_scanned', False),
            "file_url": public_url
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

@app.get('/health')
async def health_check():
    return {
        'status': 'healthy',
        'mistral_configured': bool(MISTRAL_API_KEY),
        'supabase_configured': bool(SUPABASE_URL and SUPABASE_KEY)
    }
