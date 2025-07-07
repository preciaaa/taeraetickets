from fastapi import FastAPI, File, UploadFile
from pytesseract import image_to_string
from PIL import Image, UnidentifiedImageError
import io

app = FastAPI()

@app.post('/extract-text/')
async def extract_text(file: UploadFile = File(...)):
    try:
        image = Image.open(io.BytesIO(await file.read()))
        text = image_to_string(image)
        return {'text': text}
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail='Invalid image upload')
    except TesseractError:
        raise HTTPException(status_code=401, detail='OCR processing failed')
    
