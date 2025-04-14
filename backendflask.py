from flask import Flask, request, jsonify,session
from flask_cors import CORS
import mysql.connector
import base64
import os
import uuid
import json
from datetime import datetime
import requests
from PIL import Image
import io
import clip
import torch
from transformers import CLIPProcessor, CLIPModel
import traceback
import google.generativeai as genai


app = Flask(__name__)
app.secret_key = 'grievance_chatbot_secret_key'  # Single secret key

# Configure session
app.config['SESSION_COOKIE_SECURE'] = False  # Changed to False for HTTP
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Changed back to Lax for HTTP
app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1 hour
app.config['SESSION_COOKIE_DOMAIN'] = None  # Allow cross-domain cookies

# Configure CORS with specific settings
CORS(app, 
    supports_credentials=True,
    resources={
        r"/*": {
            "origins": ["http://127.0.0.1:5500", "http://localhost:5500"],
            "allow_headers": ["Content-Type"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "supports_credentials": True,
            "expose_headers": ["Content-Type"]
        }
    }
)

# Database Configuration
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "ashimonusql@0",
    "database": "grievance_db"
}

# OpenAI Configuration
genai.configure(api_key="AIzaSyBdKeckdj2w7tFj2Ue53N8XNJRW2RhhvqY")

# Load CLIP model for image verification
device = "cuda" if torch.cuda.is_available() else "cpu"
model, preprocess = clip.load("ViT-B/32", device=device)


# Initialize database tables
def init_db():
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    
    # Create departments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
    )
    """)
    
    # Create complaints table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_number VARCHAR(20) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        department_id INT NOT NULL,
        description TEXT NOT NULL,
        status ENUM('Pending', 'In Progress', 'Resolved') DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        image_path VARCHAR(255),
        FOREIGN KEY (department_id) REFERENCES departments(id)
    )
    """)
    
    # Create users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(20)
    )
    """)
    
    # Create admins table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        department_id INT,
        FOREIGN KEY (department_id) REFERENCES departments(id)
    )
    """)
    
    # Insert default departments
    departments = [
        "Electrical", 
        "IT", 
        "Maintenance", 
        "Civil", 
        "Security", 
        "HR", 
        "Finance", 
        "Administration"
    ]
    
    for dept in departments:
        try:
            cursor.execute("INSERT INTO departments (name) VALUES (%s)", (dept,))
        except mysql.connector.errors.IntegrityError:
            # Department already exists
            pass
    
    conn.commit()
    cursor.close()
    conn.close()

# Initialize database on startup
init_db()

# Helper function to classify complaint using GPT
def classify_complaint(complaint_text):
    model = genai.GenerativeModel("gemini-1.5-pro-latest")

    prompt = """You are a complaint classification system who can classify complaints for government and doesn't take personal complaints from users. 
    Classify the following complaint into one of these departments: 
    Electrical, IT, Maintenance, Civil, Security, HR, Finance, Administration. 
    Just return the department name without any explanation."""
    
    response = model.generate_content([{"role": "user", "parts": [prompt + "\nComplaint: " + complaint_text]}])
    
    return response.text.strip()  # Extract department name

# Helper function to verify image relevance using CLIP
def verify_image_relevance(image_data, complaint_text):
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(image_data.split(',')[1])
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Process image and text with CLIP
        image_input = preprocess(image).unsqueeze(0).to(device)
        text = clip.tokenize([complaint_text]).to(device)
        
        with torch.no_grad():
            image_features = model.encode_image(image_input)
            text_features = model.encode_text(text)
            
            # Normalize features
            image_features /= image_features.norm(dim=-1, keepdim=True)
            text_features /= text_features.norm(dim=-1, keepdim=True)
            
            # Calculate similarity score
            similarity = (100.0 * image_features @ text_features.T).item()
        
        # Check if similarity score exceeds threshold
        return similarity > 25.0, similarity  # Threshold can be adjusted
    except Exception as e:
        print(f"Error in image verification: {str(e)}")
        return False, 0.0

@app.route('/api/submit_complaint', methods=['POST', 'OPTIONS'])
def submit_complaint():
    """Handles complaint submission with CORS, DB, and image processing."""
    try:
        # ✅ Handle CORS Preflight Request
        if request.method == "OPTIONS":  
            response = jsonify({"message": "CORS Preflight OK"})
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            return response, 200

        # ✅ Debug: Print incoming data
        print("Received Data:", request.json)

        data = request.json
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400

        # ✅ Extract form data
        user_name = data.get('name')
        user_email = data.get('email')
        user_phone = data.get('phone', '')
        complaint_text = data.get('complaint')
        image_data = data.get('image', None)

        if not user_name or not user_email or not complaint_text:
            return jsonify({"error": "Missing required fields"}), 400

        # ✅ Connect to MySQL Database
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()
        except Exception as e:
            print("Database Connection Error:", str(e))
            return jsonify({"error": "Database Connection Failed"}), 500

        # ✅ Check if user exists in DB, else create new user
        cursor.execute("SELECT id FROM users WHERE email = %s", (user_email,))
        user = cursor.fetchone()

        if user:
            user_id = user[0]
        else:
            cursor.execute(
                "INSERT INTO users (name, email, phone) VALUES (%s, %s, %s)",
                (user_name, user_email, user_phone)
            )
            user_id = cursor.lastrowid

        # ✅ Classify Complaint using OpenAI
        department = classify_complaint(complaint_text)

        # ✅ Get department ID from DB
        cursor.execute("SELECT id FROM departments WHERE name = %s", (department,))
        dept_result = cursor.fetchone()
        if dept_result:
            department_id = dept_result[0]
        else:
            department_id = None  # ❌ If department is not found

        # ✅ Generate unique Ticket ID
        ticket_number = f"TKT-{uuid.uuid4().hex[:8].upper()}"

        # ✅ Handle Image Upload (if provided)
        image_path = None
        if image_data:
            try:
                # ✅ Save the Image
                image_bytes = base64.b64decode(image_data.split(',')[1])
                os.makedirs("uploads", exist_ok=True)
                image_path = f"uploads/{ticket_number}.jpg"
                
                with open(image_path, "wb") as f:
                    f.write(image_bytes)
            except Exception as e:
                print("Image Processing Error:", str(e))
                image_path = None

        # ✅ Insert Complaint into Database
        cursor.execute(
            """INSERT INTO complaints 
               (ticket_number, user_id, department_id, description, image_path) 
               VALUES (%s, %s, %s, %s, %s)""",
            (ticket_number, user_id, department_id, complaint_text, image_path)
        )

        conn.commit()
        cursor.close()
        conn.close()

        # ✅ Return Success Response
        return jsonify({
            "success": True,
            "message": "Complaint submitted successfully!",
            "ticket_number": ticket_number,
            "department": department
        }), 200

    except Exception as e:
        print("Error:", str(e))
        print(traceback.format_exc())  # ✅ Print full error traceback
        return jsonify({"error": "Internal Server Error"}), 500


# Route to track complaint status
@app.route('/api/track_complaint', methods=['POST', 'OPTIONS'])
def track_complaint():
    try:
        # ✅ Handle CORS Preflight Request
        if request.method == "OPTIONS":  
            response = jsonify({"message": "CORS Preflight OK"})
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            return response, 200

        # ✅ Ensure request contains JSON data
        if not request.is_json:
            return jsonify({"success": False, "message": "Invalid request format"}), 400

        data = request.json
        ticket_number = data.get('ticket_number')

        if not ticket_number:
            return jsonify({"success": False, "message": "Ticket number is required"}), 400

        # ✅ Connect to MySQL database
        try:
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor(dictionary=True)
        except mysql.connector.Error as db_error:
            print("Database Connection Error:", db_error)
            return jsonify({"success": False, "message": "Database connection failed"}), 500

        # ✅ Fetch complaint details
        cursor.execute("""
            SELECT c.ticket_number, c.description, c.status, c.created_at, 
                   c.updated_at, COALESCE(d.name, 'Unknown') as department
            FROM complaints c
            LEFT JOIN departments d ON c.department_id = d.id
            WHERE c.ticket_number = %s
        """, (ticket_number,))

        complaint = cursor.fetchone()
        cursor.close()
        conn.close()

        # ✅ If complaint is found, return formatted response
        if complaint:
            complaint['created_at'] = complaint['created_at'].isoformat()
            complaint['updated_at'] = complaint['updated_at'].isoformat()
            return jsonify({"success": True, "complaint": complaint})

        # ✅ If ticket not found
        return jsonify({"success": False, "message": "Ticket number not found. Please check and try again."}), 404

    except Exception as e:
        print("Error:", e)  # Debugging
        return jsonify({"success": False, "message": f"An error occurred: {str(e)}"}), 500

# Admin login route
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute(
        "SELECT id, username, department_id FROM admins WHERE username = %s AND password = %s",
        (username, password)
    )
    
    admin = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if admin:
        # Clear any existing session
        session.clear()
        
        # Set session data
        session['admin_id'] = admin['id']
        session['admin_username'] = admin['username']
        session['department_id'] = admin['department_id']
        session.permanent = True  # Make session permanent
        
        response = jsonify({
            "success": True, 
            "admin": admin,
            "message": "Login successful"
        })
        
        return response
    else:
        return jsonify({
            "success": False,
            "message": "Invalid username or password"
        })

# Route to get all complaints for admin
@app.route('/api/admin/complaints', methods=['GET'])
def get_all_complaints():
    if 'admin_id' not in session:
        return jsonify({"success": False, "message": "Please login first"})
    
    department_id = request.args.get('department_id')
    status = request.args.get('status')
    
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT c.id, c.ticket_number, c.description, c.status, 
               c.created_at, c.updated_at, d.name as department,
               u.name as user_name, u.email as user_email
        FROM complaints c
        JOIN departments d ON c.department_id = d.id
        JOIN users u ON c.user_id = u.id
        WHERE 1=1
    """
    params = []
    
    if department_id:
        query += " AND c.department_id = %s"
        params.append(int(department_id))
    
    if status:
        query += " AND c.status = %s"
        params.append(status)
    
    query += " ORDER BY c.created_at DESC"
    
    cursor.execute(query, params)
    complaints = cursor.fetchall()
    
    # Format dates for JSON
    for complaint in complaints:
        complaint['created_at'] = complaint['created_at'].isoformat()
        complaint['updated_at'] = complaint['updated_at'].isoformat()
    
    cursor.close()
    conn.close()
    
    return jsonify({"success": True, "complaints": complaints})

# Route to update complaint status
@app.route('/api/admin/update_status', methods=['POST'])
def update_complaint_status():
    if 'admin_id' not in session:
        return jsonify({"success": False, "message": "Please login first"})
    
    data = request.json
    complaint_id = data.get('complaint_id')
    new_status = data.get('status')
    
    if new_status not in ['Pending', 'In Progress', 'Resolved']:
        return jsonify({
            "success": False,
            "message": "Invalid status. Status must be Pending, In Progress, or Resolved."
        })
    
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    
    cursor.execute(
        "UPDATE complaints SET status = %s WHERE id = %s",
        (new_status, complaint_id)
    )
    
    conn.commit()
    
    # Get user email for notification
    cursor.execute("""
        SELECT u.email, c.ticket_number
        FROM complaints c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = %s
    """, (complaint_id,))
    
    result = cursor.fetchone()
    user_email = result[0]
    ticket_number = result[1]
    
    cursor.close()
    conn.close()
    
    # TODO: Send email notification (implement actual email sending)
    # For now, just logging
    print(f"Status update notification would be sent to {user_email} for ticket {ticket_number}")
    
    return jsonify({
        "success": True,
        "message": f"Complaint status updated to {new_status}"
    })

# Route to get departments
@app.route('/api/admin/departments', methods=['GET'])
def get_departments():
    if 'admin_id' not in session:
        return jsonify({"success": False, "message": "Please login first"})

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id, name FROM departments")
        departments = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({"success": True, "departments": departments})
    except Exception as e:
        print("Error fetching departments:", str(e))
        return jsonify({"success": False, "message": "Internal Server Error"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
