import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as T
from PIL import Image
import numpy as np
import io
import logging

logger = logging.getLogger(__name__)

class BhuvigyanCNN(nn.Module):
    """
    Independent CNN for Visual Integrity Verification.
    Classifies satellite patches into 'Genuine' or 'Fraudulent/Suspicious'.
    """
    def __init__(self, num_classes=1):
        super(BhuvigyanCNN, self).__init__()
        # Use ResNet-18 as a robust spatial feature extractor
        self.backbone = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        
        # Replace the final fully connected layer
        num_ftrs = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Linear(num_ftrs, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
            nn.Sigmoid() if num_classes == 1 else nn.Identity()
        )

    def forward(self, x):
        return self.backbone(x)

class VisualInferenceEngine:
    def __init__(self, model_path: str = None):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = BhuvigyanCNN().to(self.device)
        
        if model_path:
            try:
                self.model.load_state_dict(torch.load(model_path, map_location=self.device))
                logger.info(f"Loaded trained CNN weights from {model_path}")
            except Exception as e:
                logger.warning(f"Could not load CNN weights: {e}. Using randomized baseline.")
        
        self.model.eval()
        
        self.transform = T.Compose([
            T.Resize((224, 224)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

    def predict_image(self, image_bytes: bytes) -> float:
        """
        Takes raw image bytes and returns a fraud probability score (0-100).
        """
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            tensor = self.transform(img).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                output = self.model(tensor)
                # Output is sigmoid (0-1)
                score = output.item() * 100
                return score
        except Exception as e:
            logger.error(f"CNN Inference failed: {e}")
            return 50.0  # Neutral fallback

    def train_on_batch(self, images: list, labels: list):
        """
        Self-training hook for the independent CNN.
        """
        self.model.train()
        # Implementation for online learning/fine-tuning would go here
        pass

# Singleton instance
cnn_engine = VisualInferenceEngine()
