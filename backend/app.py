import os
import asyncio
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime, timedelta
import jwt
from functools import wraps
from auth import hash_password, check_password, validate_email, validate_password
from database import get_db, init_db
from ai_services import ai_service

app = Flask(__name__, static_folder='../frontend')

# Production configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'fallback-secret-key-change-in-production')
app.config['JWT_ALGORITHM'] = 'HS256'

# Enhanced CORS for all free hosting platforms
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://localhost:8000",
            "http://127.0.0.1:3000", 
            "http://127.0.0.1:8000",
            "https://*.netlify.app",
            "https://*.vercel.app",
            "https://*.github.io",
            "https://*.railway.app",
            "https://*.web.app"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "supports_credentials": False
    }
})

# Rate Limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["500 per day", "100 per hour"],
    storage_uri="memory://"
)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({"error": "Authentication token required"}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
            current_user = data['email']
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

def create_token(email):
    payload = {
        'email': email,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm=app.config['JWT_ALGORITHM'])

# User quota management
def check_user_quota(user_email, feature_type):
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            "SELECT plan, ai_credits, images_generated, videos_generated FROM users WHERE email = ?", 
            (user_email,)
        )
        user = c.fetchone()
        
        if not user:
            return False, "User not found"
        
        plan = user[0]
        credits = user[1]
        
        quotas = {
            'free': {'image': 50, 'video': 5, 'background': 20},
            'pro': {'image': 1000, 'video': 100, 'background': 500},
            'enterprise': {'image': 10000, 'video': 1000, 'background': 5000}
        }
        
        plan_quota = quotas.get(plan, quotas['free'])
        
        if feature_type == 'image' and user[2] >= plan_quota['image']:
            return False, f"Image generation quota exceeded. {plan_quota['image']} images per month allowed."
        
        if feature_type == 'video' and user[3] >= plan_quota['video']:
            return False, f"Video generation quota exceeded. {plan_quota['video']} videos per month allowed."
        
        if credits <= 0:
            return False, "Insufficient credits. Please upgrade your plan."
        
        return True, "OK"

def update_user_usage(user_email, feature_type):
    with get_db() as conn:
        c = conn.cursor()
        
        if feature_type == 'image':
            c.execute(
                "UPDATE users SET images_generated = images_generated + 1, ai_credits = ai_credits - 1 WHERE email = ?",
                (user_email,)
            )
        elif feature_type == 'video':
            c.execute(
                "UPDATE users SET videos_generated = videos_generated + 1, ai_credits = ai_credits - 5 WHERE email = ?",
                (user_email,)
            )
        elif feature_type == 'background':
            c.execute(
                "UPDATE users SET ai_credits = ai_credits - 1 WHERE email = ?",
                (user_email,)
            )
        
        conn.commit()

# Serve frontend files
@app.route('/')
def serve_index():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if path.startswith('api/'):
        return jsonify({"error": "API route not found"}), 404
    return send_from_directory('../frontend', path)

# Authentication routes
@app.route('/api/signup', methods=['POST'])
@limiter.limit("10 per hour")
def signup():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()

        if not email or not password or not name:
            return jsonify({"error": "All fields are required"}), 400
        
        if not validate_email(email):
            return jsonify({"error": "Invalid email format"}), 400
        
        if not validate_password(password):
            return jsonify({"error": "Password must be at least 8 characters with uppercase letter and number"}), 400

        hashed_pw = hash_password(password)

        with get_db() as conn:
            c = conn.cursor()
            
            c.execute("SELECT email FROM users WHERE email = ?", (email,))
            if c.fetchone():
                return jsonify({"error": "Email already exists"}), 409

            c.execute(
                "INSERT INTO users (email, password, name, plan, ai_credits) VALUES (?, ?, ?, ?, ?)",
                (email, hashed_pw, name, 'free', 100)
            )
            conn.commit()

        token = create_token(email)
        
        return jsonify({
            "message": "Account created successfully! Welcome to AI Design Studio!",
            "success": True,
            "token": token,
            "user": {
                "email": email,
                "name": name,
                "plan": "free",
                "credits": 100
            }
        }), 201

    except Exception as e:
        print(f"Signup error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/login', methods=['POST'])
@limiter.limit("20 per hour")
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        with get_db() as conn:
            c = conn.cursor()
            c.execute(
                "SELECT email, password, name, plan, ai_credits, images_generated, videos_generated FROM users WHERE email = ?", 
                (email,)
            )
            user = c.fetchone()

        if not user or not check_password(password, user[1]):
            return jsonify({"error": "Invalid email or password"}), 401

        with get_db() as conn:
            c = conn.cursor()
            c.execute(
                "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE email = ?",
                (email,)
            )
            conn.commit()

        token = create_token(email)
        
        return jsonify({
            "success": True,
            "token": token,
            "user": {
                "email": user[0],
                "name": user[2],
                "plan": user[3],
                "credits": user[4],
                "usage": {
                    "images": user[5],
                    "videos": user[6]
                }
            }
        })

    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/verify-token', methods=['POST'])
@token_required
def verify_token(current_user):
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            "SELECT email, name, plan, ai_credits, images_generated, videos_generated FROM users WHERE email = ?", 
            (current_user,)
        )
        user = c.fetchone()
    
    if user:
        return jsonify({
            "success": True,
            "user": {
                "email": user[0],
                "name": user[1],
                "plan": user[2],
                "credits": user[3],
                "usage": {
                    "images": user[4],
                    "videos": user[5]
                }
            }
        })
    else:
        return jsonify({"error": "User not found"}), 404

# AI Features Routes
@app.route('/api/ai/generate-image', methods=['POST'])
@token_required
@limiter.limit("30 per hour")
def generate_image(current_user):
    try:
        quota_ok, message = check_user_quota(current_user, 'image')
        if not quota_ok:
            return jsonify({"error": message}), 402
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        prompt = data.get('prompt', '').strip()
        style = data.get('style', 'digital-art')
        width = data.get('width', 1024)
        height = data.get('height', 1024)

        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400

        if len(prompt) > 1000:
            return jsonify({"error": "Prompt too long (max 1000 characters)"}), 400

        image_data = asyncio.run(ai_service.text_to_image(prompt, style, width, height))
        update_user_usage(current_user, 'image')
        
        return jsonify({
            "success": True,
            "image": f"data:image/png;base64,{image_data}",
            "prompt": prompt,
            "credits_used": 1
        })

    except Exception as e:
        print(f"Image generation error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/remove-background', methods=['POST'])
@token_required
@limiter.limit("50 per hour")
def remove_background(current_user):
    try:
        quota_ok, message = check_user_quota(current_user, 'background')
        if not quota_ok:
            return jsonify({"error": message}), 402
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        image_data = data.get('image', '')
        if not image_data:
            return jsonify({"error": "Image data is required"}), 400

        result_image = asyncio.run(ai_service.remove_background(image_data))
        update_user_usage(current_user, 'background')
        
        return jsonify({
            "success": True,
            "image": f"data:image/png;base64,{result_image}",
            "credits_used": 1
        })

    except Exception as e:
        print(f"Background removal error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/generate-video', methods=['POST'])
@token_required
@limiter.limit("10 per hour")
def generate_video(current_user):
    try:
        quota_ok, message = check_user_quota(current_user, 'video')
        if not quota_ok:
            return jsonify({"error": message}), 402
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        text = data.get('text', '').strip()
        image_url = data.get('image_url', '')
        voice_type = data.get('voice_type', 'en_female_1')

        if not text:
            return jsonify({"error": "Text is required"}), 400

        if len(text) > 1000:
            return jsonify({"error": "Text too long (max 1000 characters)"}), 400

        video_url = asyncio.run(ai_service.text_to_video(text, image_url, voice_type))
        update_user_usage(current_user, 'video')
        
        return jsonify({
            "success": True,
            "video_url": video_url,
            "text": text,
            "credits_used": 5
        })

    except Exception as e:
        print(f"Video generation error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/generate-cv', methods=['POST'])
@token_required
def generate_cv(current_user):
    try:
        quota_ok, message = check_user_quota(current_user, 'image')
        if not quota_ok:
            return jsonify({"error": "Please upgrade to generate more CVs"}), 402
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        user_data = data.get('user_data', {})
        template_type = data.get('template_type', 'modern')

        if not user_data.get('name') or not user_data.get('email'):
            return jsonify({"error": "Name and email are required"}), 400

        cv_content = asyncio.run(ai_service.generate_cv_content(user_data, template_type))
        
        return jsonify({
            "success": True,
            "cv": cv_content,
            "template": template_type
        })

    except Exception as e:
        print(f"CV generation error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# User management routes
@app.route('/api/user/profile', methods=['GET'])
@token_required
def get_user_profile(current_user):
    try:
        with get_db() as conn:
            c = conn.cursor()
            c.execute(
                "SELECT email, name, plan, ai_credits, images_generated, videos_generated, created_at FROM users WHERE email = ?", 
                (current_user,)
            )
            user = c.fetchone()
        
        if user:
            return jsonify({
                "success": True,
                "user": {
                    "email": user[0],
                    "name": user[1],
                    "plan": user[2],
                    "credits": user[3],
                    "usage": {
                        "images": user[4],
                        "videos": user[5]
                    },
                    "joined": user[6]
                }
            })
        else:
            return jsonify({"error": "User not found"}), 404
            
    except Exception as e:
        print(f"Get profile error: {str(e)}")
        return jsonify({"error": "Failed to fetch profile"}), 500

@app.route('/api/user/upgrade', methods=['POST'])
@token_required
def upgrade_plan(current_user):
    try:
        data = request.get_json()
        plan = data.get('plan', 'pro')
        
        valid_plans = ['pro', 'enterprise']
        if plan not in valid_plans:
            return jsonify({"error": "Invalid plan"}), 400
        
        with get_db() as conn:
            c = conn.cursor()
            c.execute(
                "UPDATE users SET plan = ?, ai_credits = ai_credits + ? WHERE email = ?",
                (plan, 1000 if plan == 'pro' else 5000, current_user)
            )
            conn.commit()
        
        return jsonify({
            "success": True,
            "message": f"Upgraded to {plan} plan successfully!",
            "plan": plan
        })
        
    except Exception as e:
        print(f"Upgrade error: {str(e)}")
        return jsonify({"error": "Failed to upgrade plan"}), 500

# Design routes
@app.route('/api/designs', methods=['GET'])
@token_required
def get_designs(current_user):
    try:
        with get_db() as conn:
            c = conn.cursor()
            c.execute(
                "SELECT id, name, data, created_at FROM designs WHERE user_email = ? ORDER BY created_at DESC",
                (current_user,)
            )
            designs = c.fetchall()
        
        return jsonify({
            "success": True,
            "designs": [
                {
                    "id": design[0],
                    "name": design[1],
                    "data": design[2],
                    "created_at": design[3]
                } for design in designs
            ]
        })
    except Exception as e:
        print(f"Get designs error: {str(e)}")
        return jsonify({"error": "Failed to fetch designs"}), 500

@app.route('/api/designs', methods=['POST'])
@token_required
def save_design(current_user):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        name = data.get('name', 'Untitled Design').strip()
        design_data = data.get('data', '{}')

        if not name:
            return jsonify({"error": "Design name is required"}), 400

        with get_db() as conn:
            c = conn.cursor()
            c.execute(
                "INSERT INTO designs (user_email, name, data) VALUES (?, ?, ?)",
                (current_user, name, design_data)
            )
            conn.commit()
            design_id = c.lastrowid

        return jsonify({
            "success": True,
            "message": "Design saved successfully",
            "design_id": design_id
        })
    except Exception as e:
        print(f"Save design error: {str(e)}")
        return jsonify({"error": "Failed to save design"}), 500

@app.route('/api/designs/<int:design_id>', methods=['DELETE'])
@token_required
def delete_design(current_user, design_id):
    try:
        with get_db() as conn:
            c = conn.cursor()
            c.execute(
                "DELETE FROM designs WHERE id = ? AND user_email = ?",
                (design_id, current_user)
            )
            conn.commit()
            
            if c.rowcount == 0:
                return jsonify({"error": "Design not found"}), 404

        return jsonify({
            "success": True,
            "message": "Design deleted successfully"
        })
    except Exception as e:
        print(f"Delete design error: {str(e)}")
        return jsonify({"error": "Failed to delete design"}), 500

# Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT COUNT(*) FROM users")
            user_count = c.fetchone()[0]
            
            c.execute("SELECT COUNT(*) FROM designs")
            design_count = c.fetchone()[0]
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "2.0.0",
            "stats": {
                "total_users": user_count,
                "total_designs": design_count
            },
            "ai_features": {
                "image_generation": True,
                "background_removal": True,
                "video_generation": True,
                "cv_generation": True
            }
        })
    except Exception as e:
        return jsonify({
            "status": "degraded",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    init_db()
    print("🚀 AI Design Studio SaaS Platform running on http://localhost:8000")
    print("📊 Health check: http://localhost:8000/api/health")
    print("👥 Multi-user ready with quota management")
    print("💳 Free tier: 50 images, 5 videos, 20 background removals")
    app.run(host='0.0.0.0', port=8000, debug=False)