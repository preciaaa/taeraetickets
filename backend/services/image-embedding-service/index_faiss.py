import faiss
import numpy as np

index = faiss.IndexFlatL2(2048)  # for resnet50

def add_embedding(embedding, metadata):
    index.add(np.array([embedding]))  # Add vector
    # save to supabase

def search_similar(embedding, top_k=5):
    distances, indices = index.search(np.array([embedding]), top_k)
    return distances, indices
