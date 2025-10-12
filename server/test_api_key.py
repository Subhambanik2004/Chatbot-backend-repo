#!/usr/bin/env python3
"""
Test script to verify Google AI API key is working
"""
import os
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# Load environment variables
load_dotenv()


def test_api_key():
    """Test if the Google AI API key is working"""
    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:
        print("❌ GOOGLE_API_KEY not found in environment variables")
        return False

    if api_key == "AIzaSyC_your_new_api_key_here":
        print("❌ Please replace the placeholder API key with your actual key")
        return False

    print(f"✅ API Key found: {api_key[:20]}...")

    try:
        # Test embedding generation
        embeddings_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        test_embedding = embeddings_model.embed_documents(["test content"])[0]

        print(
            f"✅ API Key is working! Generated embedding with {len(test_embedding)} dimensions"
        )
        return True

    except Exception as e:
        print(f"❌ API Key test failed: {str(e)}")
        return False


if __name__ == "__main__":
    print("Testing Google AI API Key...")
    test_api_key()
