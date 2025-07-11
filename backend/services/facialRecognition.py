# pip install pillow numpy opencv-python torch torchvision facenet-pytorch
# pip install python-dotenv
# pip install supabase
from dotenv import load_dotenv
load_dotenv(dotenv_path=".env.local")

import os
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List
import math
import httpx
import json
from torchvision import transforms
from PIL import Image
import numpy as np
import torch
import cv2
from facenet_pytorch import InceptionResnetV1
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase environment variables not loaded. Check .env.local path.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

router = APIRouter()
model = InceptionResnetV1(pretrained='vggface2').eval()

class CompareFacesRequest(BaseModel):
    userId: str
    liveEmbedding: List[float]

@router.post("/extract-embedding")
async def extract_embedding(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    image_bytes = await file.read()
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    pil_img = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    preprocess = transforms.Compose([
        transforms.Resize((160, 160)),
        transforms.ToTensor(),
        transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
    ])
    img_tensor = preprocess(pil_img).unsqueeze(0)

    with torch.no_grad():
        embedding = model(img_tensor).squeeze().numpy()
    embedding_list = embedding.tolist()

    response = supabase.table("users").update({
        "face_embedding": embedding_list
    }).eq("id", user_id).execute()
    
    print("Supabase update response:", response)

    if not response or not response.data:
        raise HTTPException(status_code=500, detail=f"Failed to update embedding in Supabase. Response: {response}")

    return {"message": "Embedding updated successfully."}


@router.post("/compare-faces")
async def compare_faces(payload: CompareFacesRequest):
    user_id = payload.userId
    live_embedding = payload.liveEmbedding

    async with httpx.AsyncClient() as client:
        try:
            user_response = await client.get(f"http://localhost:3000/users/{user_id}")
            user_response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail="User not found")

    stored_embedding_raw = user_response.json().get("face_embedding")
    stored_embedding = json.loads(stored_embedding_raw) if isinstance(stored_embedding_raw, str) else stored_embedding_raw

    if len(stored_embedding) != len(live_embedding):
        raise HTTPException(status_code=400, detail="Embedding lengths do not match")

    distance = math.sqrt(sum((a - b) ** 2 for a, b in zip(stored_embedding, live_embedding)))
    match = distance < 0.6

    if match:
        await client.post(f"http://localhost:3000/users/{user_id}/verification", json={"verified": True})

    return {"match": match, "distance": distance}
