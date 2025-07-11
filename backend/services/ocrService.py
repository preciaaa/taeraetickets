from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pytesseract import image_to_string
from PIL import Image, UnidentifiedImageError
import PyPDF2
import io
import requests
import base64
import os

app = FastAPI()

# Configure app to handle larger files
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_text_with_aws_textract(image_bytes):
    """
    Use AWS Textract for OCR
    This is excellent for document processing and ticket extraction
    """
    try:
        # You would need to set up AWS Textract
        # 1. Create AWS account
        # 2. Install boto3: pip install boto3
        # 3. Configure AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
        # 4. Set AWS region (AWS_DEFAULT_REGION)
        
        # Example implementation:
        import boto3
        textract = boto3.client('textract', region_name='us-east-1')
        response = textract.detect_document_text(
            Document={'Bytes': image_bytes}
        )
        text = ''
        for item in response['Blocks']:
            if item['BlockType'] == 'LINE':
                text += item['Text'] + '\n'
        return text
        
    except Exception as e:
        print(f"AWS Textract error: {e}")
        return ""

def convert_pdf_to_images_aws(pdf_bytes):
    """
    Convert PDF to images using AWS services
    """
    try:
        # You can use AWS services to convert PDF to images
        # 1. AWS Lambda with pdf2image
        # 2. AWS Step Functions for workflow
        # 3. Or use a third-party service that works with AWS
        
        # For now, return None to show the structure
        print("AWS PDF to image conversion would happen here")
        return None
        
    except Exception as e:
        print(f"AWS PDF to image conversion error: {e}")
        return None

@app.post('/extract-text/')
async def extract_text(file: UploadFile = File(...)):
    # Check file size manually (100MB limit)
    if file.size and file.size > 100 * 1024 * 1024:
        raise HTTPException(status_code=413, detail='File too large. Maximum size is 100MB.')
    
    file_bytes = await file.read()
    try:
        if file.filename and (file.filename.lower().endswith('.pdf') or file.content_type == 'application/pdf'):
            # First, try to extract text directly from PDF using PyPDF2
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            text = ''
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                text += page_text + '\n'
                print(f"Page text length: {len(page_text)}")
                print(f"Page text preview: {page_text[:200]}...")
            
            print(f"Total extracted text length: {len(text)}")
            print(f"Total text preview: {text[:500]}...")
            
            # If no text was extracted, try AWS conversion
            if not text.strip():
                print("No text found with PyPDF2, trying AWS conversion...")
                images = convert_pdf_to_images_aws(file_bytes)
                
                if images:
                    # Convert images to text using AWS Textract
                    text = ''
                    for i, image in enumerate(images):
                        page_text = extract_text_with_aws_textract(image)
                        text += f"Page {i+1}:\n{page_text}\n"
                        print(f"AWS Textract Page {i+1} text length: {len(page_text)}")
                    
                    if not text.strip():
                        return {
                            'text': 'No text could be extracted from this PDF using AWS Textract.',
                            'is_scanned': True
                        }
                    
                    return {'text': text, 'is_scanned': False}
                else:
                    return {
                        'text': 'This appears to be a scanned PDF. AWS conversion service not configured.',
                        'is_scanned': True
                    }
            
            return {'text': text, 'is_scanned': False}
        else:
            # Handle image files - use AWS Textract for best results
            text = extract_text_with_aws_textract(file_bytes)
            if not text:
                # Fallback to local OCR
                image = Image.open(io.BytesIO(file_bytes))
                text = image_to_string(image)
            return {'text': text, 'is_scanned': False}
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail='Invalid image or PDF upload')
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'OCR processing failed: {str(e)}')
    
