from sentence_transformers import SentenceTransformer
from app.config.settings import settings
import numpy as np

class Embedder:
    def __init__(self):
        self.model = SentenceTransformer(settings.EMBEDDING_MODEL)

    def generate_embeddings(self, texts: list[str]) -> np.ndarray:
        """
        Generates embeddings for a list of texts.
        """
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return embeddings

embedder = Embedder()
