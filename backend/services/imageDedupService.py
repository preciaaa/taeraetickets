from flask import Flask, request, jsonify
from pdf2image import convert_from_bytes
from PIL import Image
import imagehash
from dotenv import load_dotenv
import os
from supabase import create_client, Client

load_dotenv(dotenv_path="../.env.local")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase environment variables not loaded. Check .env.local path.")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = Flask(__name__)

POPPLER_PATH = r"C:\Program Files\poppler-24.08.0\Library\bin"  

@app.route('/check-duplicate', methods=['POST'])
def check_duplicate():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    is_pdf = (file.filename and file.filename.endswith('.pdf')) or (file.mimetype == 'application/pdf')
    if is_pdf:
        try:
            images = convert_from_bytes(file.read(), first_page=1, last_page=1, poppler_path=POPPLER_PATH)
            img = images[0]
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'PDF to image failed: {str(e)}'}), 500
    else:
        try:
            img = Image.open(file.stream)
        except Exception as e:
            return jsonify({'error': f'Image open failed: {str(e)}'}), 500

    img = img.convert('L').resize((256, 256))
    phash = str(imagehash.phash(img))

    response = supabase.table("listings").select("phash").eq("phash", phash).execute()
    is_duplicate = len(response.data) > 1

    print("Computed phash:", phash)
    print("Supabase response:", response.data)
    return jsonify({'is_duplicate': is_duplicate, 'phash': phash})

if __name__ == '__main__':
    app.run(port=5003, debug=True) 