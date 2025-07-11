from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import os
import io

app = FastAPI()

# Configure app to handle larger files
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get Mistral API key from environment variable
MISTRAL_API_KEY = os.environ.get('MISTRAL_API_KEY')
if not MISTRAL_API_KEY:
    print("Warning: MISTRAL_API_KEY not found in environment variables")

@app.post('/extract-text/')
async def extract_text(file: UploadFile = File(...)):
    # Check file size manually (100MB limit)
    if file.size and file.size > 100 * 1024 * 1024:
        raise HTTPException(status_code=413, detail='File too large. Maximum size is 100MB.')
    
    if not MISTRAL_API_KEY:
        raise HTTPException(status_code=500, detail='Mistral API key not configured')
    
    file_bytes = await file.read()
    try:
        # Prepare the request to Mistral.ai OCR API
        # Note: You'll need to replace this with the actual Mistral.ai OCR endpoint
        headers = {
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
            "Content-Type": "application/octet-stream"
        }
        
        # For now, using a placeholder endpoint - replace with actual Mistral.ai OCR endpoint
        response = requests.post(
            "https://api.mistral.ai/v1/ocr/extract",  # Replace with actual endpoint
            headers=headers,
            data=file_bytes,
            timeout=60  # 60 second timeout for large files
        )
        
        if response.status_code != 200:
            print(f"Mistral API error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=500, 
                detail=f"OCR API error: {response.status_code} - {response.text}"
            )

        # Parse the response - adjust based on actual Mistral.ai response format
        ocr_result = response.json()
        
        # Extract text from response - adjust field names based on actual API response
        if 'text' in ocr_result:
            text = ocr_result['text']
        elif 'content' in ocr_result:
            text = ocr_result['content']
        elif 'result' in ocr_result and 'text' in ocr_result['result']:
            text = ocr_result['result']['text']
        else:
            # If we can't find text in expected fields, return the full response for debugging
            text = str(ocr_result)
        
        print(f"Extracted text length: {len(text)}")
        print(f"Text preview: {text[:500]}...")
        
        return {
            'text': text,
            'is_scanned': False,
            'raw_response': ocr_result  # Include raw response for debugging
        }
        
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=408, detail='OCR request timed out')
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f'OCR API request failed: {str(e)}')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'OCR processing failed: {str(e)}')

@app.get('/health')
async def health_check():
    return {
        'status': 'healthy',
        'mistral_configured': bool(MISTRAL_API_KEY)
    } 