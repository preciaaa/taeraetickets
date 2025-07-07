import io
import os
from flask import Flask, request, jsonify
from PIL import Image
import torch
import torchvision.transforms as transforms
import torchvision.models as models
import numpy as np
import faiss

app = Flask(__name__)

# Load ResNet model
resnet = models.resnet50(pretrained=True)
resnet.eval()

# Remove the final classification layer
feature_extractor = torch.nn.Sequential(*list(resnet.children())[:-1])

# FAISS index (in-memory)
embedding_dim = 2048
faiss_index = faiss.IndexFlatL2(embedding_dim)
embeddings_list = []  # To keep track of embeddings for mapping

# Image preprocessing
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def get_embedding(image: Image.Image):
    img_t = preprocess(image).unsqueeze(0)
    with torch.no_grad():
        features = feature_extractor(img_t)
    embedding = features.squeeze().numpy()
    return embedding

@app.route('/check-duplicate', methods=['POST'])
def check_duplicate():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    image_file = request.files['image']
    image = Image.open(image_file.stream).convert('RGB')
    embedding = get_embedding(image).astype('float32')

    # Check for duplicates
    is_duplicate = False
    min_distance = None
    if faiss_index.ntotal > 0:
        D, I = faiss_index.search(np.expand_dims(embedding, axis=0), k=1)
        min_distance = float(D[0][0])
        if min_distance < 0.5:  # Threshold, tune as needed
            is_duplicate = True
    
    # If not duplicate, add to index
    if not is_duplicate:
        faiss_index.add(np.expand_dims(embedding, axis=0))
        embeddings_list.append({'embedding': embedding.tolist()})

    return jsonify({'is_duplicate': is_duplicate, 'min_distance': min_distance, 'embedding': embedding.tolist()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002) 