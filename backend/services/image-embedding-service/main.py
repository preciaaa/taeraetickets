from fastapi import FastAPI, UploadFile, File
from PIL import Image
from model import get_resnet_model, transform
from index_faiss import add_embedding, search_similar
import torch
import io

model = get_resnet_model()
app = FastAPI()

@app.post("/embed/")
async def embed_image(file: UploadFile = File(...)):
    image = Image.open(io.BytesIO(await file.read())).convert("RGB")
    input_tensor = transform(image).unsqueeze(0)
    with torch.no_grad():
        embedding = model(input_tensor).squeeze().numpy()

    add_embedding(embedding, metadata={"id": file.filename})
    return {"status": "added"}

@app.post("/search/")
async def search_image(file: UploadFile = File(...)):
    image = Image.open(io.BytesIO(await file.read())).convert("RGB")
    input_tensor = transform(image).unsqueeze(0)
    with torch.no_grad():
        embedding = model(input_tensor).squeeze().numpy()

    distances, indices = search_similar(embedding)
    return {"distances": distances.tolist(), "indices": indices.tolist()}
