import torch
from transformers import pipeline, BlipProcessor, BlipForConditionalGeneration
from sentence_transformers import SentenceTransformer, util 
import logging
from dataclasses import dataclass
from typing import Optional, Dict
from enum import Enum
import json
from datetime import datetime
from PIL import Image

from transformers import BertForSequenceClassification, BertTokenizerFast
import joblib

# Logging setup
logging.basicConfig(
    filename='complaint_processing.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Load NLP and Vision Models
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli") 
summarizer = pipeline("summarization", model="facebook/bart-large-cnn") 
blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base") 
blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base") 
text_similarity_model = SentenceTransformer('all-MiniLM-L6-v2') 


class ComplaintStatus(Enum):
    PENDING = "pending"
    REQUIRES_IMAGE = "requires_image"
    REJECTED = "rejected"
    ACCEPTED = "accepted"
    OUT_OF_SCOPE = "out_of_scope"


@dataclass
class ComplaintVerificationResult:
    status: ComplaintStatus
    confidence: float
    message: str
    department: Optional[str] = None
    sub_category: Optional[str] = None
    is_urgent: bool = False
    requires_image: bool = False
    image_verification_attempts: int = 0


class ComplaintProcessor:
    def __init__(self, text_confidence_threshold=0.25, image_confidence_threshold=0.3, max_image_attempts=3):
        self.text_confidence_threshold = text_confidence_threshold
        self.image_confidence_threshold = image_confidence_threshold
        self.max_image_attempts = max_image_attempts

        self.departments = {
            "Electricity Department": ["Power Outage", "Streetlight Issue", "Faulty Meter", "Billing Issue"],
            "Water Supply Department": ["No Water", "Water Leakage", "Polluted Water", "Sewage Issue"],
            "Road & Transport": ["Potholes", "Traffic Signal Malfunction", "Public Transport Issue"],
            "Waste Management": ["Garbage Collection Delay", "Illegal Dumping", "Recycling Issue"],
            "Public Safety": ["Crime Report", "Harassment", "Fire Incident", "Accident Report"],
            "Health & Sanitation": ["Hospital Complaint", "Emergency Medical Assistance", "Sanitation Issue"],
            "Education": ["School Infrastructure Issue", "Teacher Misconduct", "Lack of Study Materials"],
            "Law & Order": ["Police Complaint", "Violation of Law", "Court Case Related Query", "Missing Person", "Illegal Construction"],
            "Administrative Services": ["ID Card Issue", "Address Proof Update", "Document Verification", "Delayed Application", "Office Misbehavior"]
        }


        self.image_required_categories = {
            "Waste Management": ["Garbage Collection Delay", "Illegal Dumping"],
            "Road & Transport": ["Potholes", "Traffic Signal Malfunction"],
            "Water Supply Department": ["Water Leakage", "Sewage Issue"],
            "Public Safety": ["Fire Incident", "Accident Report"]
        }

        self.image_keywords = ["damaged", "fallen", "dirty", "unclean", "broken", "blocked", "overflowing", "leaking"]
        self.urgent_keywords = ["fire", "accident", "emergency", "life-threatening", "collapse", "urgent", "critical", "immediate"]
        self.personal_keywords = [
            "friend", "family", "sleeping", "eating", "personal", "private", "headache", "fever", "i am sick",
            "my health", "appointment", "medicine", "tired", "sad", "depressed", "breakup", "feeling lonely"
        ]

    def is_valid_government_complaint(self, text, classification_result):
        lowered = text.lower()

        if any(word in lowered for word in self.personal_keywords):
            print("Detected as personal content.")
            return False

        if classification_result["scores"][0] < self.text_confidence_threshold:
            print("Low confidence — likely not a valid civic complaint.")
            return False

        if classification_result["labels"][0] == "Education" and not any(edu_word in lowered for edu_word in ["school", "teacher", "college", "student"]):
            print("Mismatched department for the given text — possible personal or junk input.")
            return False

        return True

    def requires_image(self, category, sub_category, complaint_text):
        if category in self.image_required_categories and sub_category in self.image_required_categories[category]:
            return True
        if any(word in complaint_text.lower() for word in self.image_keywords):
            return True
        return False

    def generate_image_caption(self, image_path):
        try:
            image = Image.open(image_path).convert("RGB")
            inputs = blip_processor(image, return_tensors="pt")
            out = blip_model.generate(**inputs)
            caption = blip_processor.decode(out[0], skip_special_tokens=True)
            return caption
        except Exception as e:
            logging.error(f"Error generating image caption: {str(e)}")
            return ""

    def verify_image_relevance(self, image_path, complaint_text):
        try:
            generated_caption = self.generate_image_caption(image_path)
            if not generated_caption:
                return "", 0.0

            embeddings = text_similarity_model.encode([complaint_text, generated_caption])
            similarity = util.cos_sim(embeddings[0], embeddings[1]).item()
            return generated_caption, similarity
        except Exception as e:
            logging.error(f"Error in image verification: {str(e)}")
            return "", 0.0

    def process_complaint(self, complaint_text, image_path=None, previous_result=None):
        main_categories = list(self.departments.keys())
        classification = classifier(complaint_text, candidate_labels=main_categories)
        print(f"Classification Result: {classification}")

        if not self.is_valid_government_complaint(complaint_text, classification):
            return ComplaintVerificationResult(
                status=ComplaintStatus.OUT_OF_SCOPE,
                confidence=classification["scores"][0],
                message="This appears to be a personal matter that cannot be handled by government departments."
            )

        main_department = classification["labels"][0]
        sub_categories = self.departments[main_department]
        sub_classification = classifier(complaint_text, candidate_labels=sub_categories)
        sub_department = sub_classification["labels"][0]

        needs_image = self.requires_image(main_department, sub_department, complaint_text)

        if needs_image and not image_path:
            return ComplaintVerificationResult(
                status=ComplaintStatus.REQUIRES_IMAGE,
                confidence=classification["scores"][0],
                message="Please provide an image to support your complaint.",
                department=main_department,
                sub_category=sub_department,
                requires_image=True
            )

        if needs_image and image_path:
            image_caption, image_confidence = self.verify_image_relevance(image_path, complaint_text)

            if image_confidence < self.image_confidence_threshold:
                return ComplaintVerificationResult(
                    status=ComplaintStatus.REJECTED,
                    confidence=image_confidence,
                    message="Complaint rejected due to insufficient image verification.",
                    department=main_department,
                    sub_category=sub_department
                )

        is_urgent = any(word in complaint_text.lower() for word in self.urgent_keywords)
        self._log_complaint(complaint_text, main_department, sub_department, is_urgent, bool(image_path))

        return ComplaintVerificationResult(
            status=ComplaintStatus.ACCEPTED,
            confidence=classification["scores"][0],
            message="Complaint accepted and will be processed.",
            department=main_department,
            sub_category=sub_department,
            is_urgent=is_urgent
        )

    def _log_complaint(self, text, department, sub_category, is_urgent, had_image):
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "text": text,
            "department": department,
            "sub_category": sub_category,
            "is_urgent": is_urgent,
            "had_image": had_image
        }
        logging.info(f"Accepted complaint: {json.dumps(log_entry)}")



if __name__ == "__main__":
    processor = ComplaintProcessor()

    # Hardcoded complaint text and image path for testing
    user_text = "water leakage through sewage pipe"
    image_path = "images/drain.jpg"

    print(f"Complaint: {user_text}")
    result = processor.process_complaint(user_text)

    # classification = classifier(user_text, candidate_labels=self.departments)
    # print(f"Classification Result: {classification}")


    if result.status == ComplaintStatus.REQUIRES_IMAGE:
        print(result.message)
        print(f"Using image: {image_path}")
        result = processor.process_complaint(user_text, image_path=image_path, previous_result=result)


    print("\n--- Final Complaint Status ---")
    print(f"Status: {result.status.value}")
    print(f"Message: {result.message}")
    print(f"Department: {result.department}")
    print(f"Sub-Category: {result.sub_category}")
    # print(f"Image Required: {result.requires_image}")