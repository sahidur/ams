#!/bin/bash

# Face-API.js Model Download Script
# Downloads the required face recognition models to public/models/

MODELS_DIR="public/models"

# Create models directory
mkdir -p $MODELS_DIR

echo "Downloading face-api.js models..."

# Model URLs from face-api.js GitHub
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

# Tiny Face Detector
curl -L "$BASE_URL/tiny_face_detector_model-shard1" -o "$MODELS_DIR/tiny_face_detector_model-shard1"
curl -L "$BASE_URL/tiny_face_detector_model-weights_manifest.json" -o "$MODELS_DIR/tiny_face_detector_model-weights_manifest.json"

# Face Landmark 68 Net
curl -L "$BASE_URL/face_landmark_68_model-shard1" -o "$MODELS_DIR/face_landmark_68_model-shard1"
curl -L "$BASE_URL/face_landmark_68_model-weights_manifest.json" -o "$MODELS_DIR/face_landmark_68_model-weights_manifest.json"

# Face Recognition Net
curl -L "$BASE_URL/face_recognition_model-shard1" -o "$MODELS_DIR/face_recognition_model-shard1"
curl -L "$BASE_URL/face_recognition_model-shard2" -o "$MODELS_DIR/face_recognition_model-shard2"
curl -L "$BASE_URL/face_recognition_model-weights_manifest.json" -o "$MODELS_DIR/face_recognition_model-weights_manifest.json"

# Face Expression Net
curl -L "$BASE_URL/face_expression_model-shard1" -o "$MODELS_DIR/face_expression_model-shard1"
curl -L "$BASE_URL/face_expression_model-weights_manifest.json" -o "$MODELS_DIR/face_expression_model-weights_manifest.json"

echo "Models downloaded successfully to $MODELS_DIR"
echo ""
echo "Available models:"
ls -la $MODELS_DIR
