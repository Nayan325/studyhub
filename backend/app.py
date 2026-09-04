from flask import Flask, request, jsonify, session,send_from_directory
from flask_cors import CORS
import mysql.connector
import bcrypt
from werkzeug.utils import secure_filename
import os

app = Flask(__name__)

# =========================
# UPLOAD CONFIGURATION
# =========================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

ALLOWED_EXTENSIONS = {
    "pdf",
    "mp4",
    "webm"
}

# Session secret key
app.secret_key = "studyhub-secret-key"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False

# Frontend: http://localhost:5500
CORS(
    app,
    origins=["http://127.0.0.1:5500"],
    supports_credentials=True
)

# =========================
# DATABASE CONNECTION
# =========================

def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="Nayan@2005",
        database="studyhub"
    )


# =========================
# HOME
# =========================

@app.route("/")
def home():
    return "StudyHub Backend is running! 🚀"


# =========================
# REGISTER
# =========================

@app.route("/register", methods=["POST"])
def register():

    try:

        data = request.get_json()

        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not name or not email or not password:
            return jsonify({
                "message": "All fields are required!"
            }), 400


        connection = get_connection()
        cursor = connection.cursor()


        # Check if email already exists
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (email,)
        )

        existing_user = cursor.fetchone()


        if existing_user:

            cursor.close()
            connection.close()

            return jsonify({
                "message": "Email already registered!"
            }), 409


        # Hash password
        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        )


        query = """
        INSERT INTO users (name, email, password)
        VALUES (%s, %s, %s)
        """


        cursor.execute(
            query,
            (
                name,
                email,
                hashed_password.decode("utf-8")
            )
        )


        connection.commit()

        cursor.close()
        connection.close()


        return jsonify({
            "message": "User registered successfully! ✅"
        }), 201


    except Exception as error:

        print("Register Error:", error)

        return jsonify({
            "message": "Registration failed!"
        }), 500


# =========================
# LOGIN
# =========================

@app.route("/login", methods=["POST"])
def login():

    try:

        data = request.get_json()

        email = data.get("email")
        password = data.get("password")


        if not email or not password:

            return jsonify({
                "message": "Email and password are required!"
            }), 400


        connection = get_connection()
        cursor = connection.cursor()


        cursor.execute(
            """
            SELECT id, name, email, password
            FROM users
            WHERE email = %s
            """,
            (email,)
        )


        user = cursor.fetchone()


        cursor.close()
        connection.close()


        if user is None:

            return jsonify({
                "message": "Invalid email or password ❌"
            }), 401


        user_id, name, user_email, hashed_password = user


        # Verify password
        password_match = bcrypt.checkpw(
            password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )


        if not password_match:

            return jsonify({
                "message": "Invalid email or password ❌"
            }), 401


        # Create session
        session.clear()

        session["user_id"] = user_id
        session["user_name"] = name
        session["user_email"] = user_email


        print("LOGIN SUCCESS:", name)


        return jsonify({
            "message": "Login successful! ✅",
            "user": {
                "id": user_id,
                "name": name,
                "email": user_email
            }
        })


    except Exception as error:

        print("Login Error:", error)

        return jsonify({
            "message": "Login failed!"
        }), 500


# =========================
# CURRENT USER
# =========================

@app.route("/me", methods=["GET"])
def me():

    if "user_id" not in session:
        return jsonify({
            "message": "Not logged in ❌"
        }), 401

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, name, email, can_upload, role
            FROM users
            WHERE id = %s
            """,
            (session["user_id"],)
        )

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "message": "User not found!"
            }), 404

        return jsonify({
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "can_upload": bool(user["can_upload"]),
            "role": user["role"]
        }), 200

    except Exception as error:

        print("ME Error:", error)

        return jsonify({
            "message": "Unable to get user information!"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()
# =========================
# UPLOAD CONTENT
# =========================

@app.route("/upload", methods=["POST"])
def upload_content():

    # User login hai ya nahi
    if "user_id" not in session:

        return jsonify({
            "message": "Please login first! ❌"
        }), 401


    user_id = session["user_id"]


    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor(dictionary=True)


        # Check upload permission
        cursor.execute(
            """
            SELECT can_upload
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()


        # Permission nahi hai
        if not user or not user["can_upload"]:

            return jsonify({
                "message": "You are not authorized to upload content! ❌"
            }), 403


        # Form data
        title = request.form.get("title")
        subject = request.form.get("subject")
        description = request.form.get("description")

        file = request.files.get("file")


        if not title or not subject or not file:

            return jsonify({
                "message": "Title, subject and file are required!"
            }), 400


        # File extension
        filename = secure_filename(file.filename)

        extension = filename.rsplit(".", 1)[-1].lower()


        # Allowed files
        if extension not in ALLOWED_EXTENSIONS:

            return jsonify({
                "message": "Only PDF, MP4 and WEBM files are allowed!"
            }), 400


        # Save file
        file_path = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )

        file.save(file_path)


        # Save information in MySQL
        cursor.execute(
            """
            INSERT INTO study_material
            (title, description, subject, file_path, uploaded_by)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                title,
                description,
                subject,
                filename,
                user_id
            )
        )


        connection.commit()


        return jsonify({
            "message": "Study material uploaded successfully! ✅"
        }), 201


    except Exception as error:

        print("Upload Error:", error)

        return jsonify({
            "message": "Upload failed!"
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()

# =========================
# GET STUDY MATERIAL
# =========================

@app.route("/study-material", methods=["GET"])
def get_study_material():

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                sm.id,
                sm.title,
                sm.description,
                sm.subject,
                sm.file_path,
                sm.created_at,
                u.name AS uploader_name
            FROM study_material sm
            LEFT JOIN users u
                ON sm.uploaded_by = u.id
            ORDER BY sm.created_at DESC
            """
        )

        materials = cursor.fetchall()

        return jsonify(materials), 200


    except Exception as error:

        print("Study Material Error:", error)

        return jsonify({
            "message": "Unable to load study material."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()
# =========================
# OPEN STUDY FILE
# =========================

@app.route("/files/<path:filename>")
def open_file(filename):

    return send_from_directory(
        app.config["UPLOAD_FOLDER"],
        filename
    )

# =========================
# DELETE STUDY MATERIAL
# =========================

@app.route("/delete-material/<int:material_id>", methods=["DELETE"])
def delete_material(material_id):

    if "user_id" not in session:
        return jsonify({
            "message": "Please login first! ❌"
        }), 401

    connection = None
    cursor = None

    try:

        connection = get_connection()

        cursor = connection.cursor(dictionary=True)

        # Check current user
        cursor.execute(
            """
            SELECT role
            FROM users
            WHERE id = %s
            """,
            (session["user_id"],)
        )

        user = cursor.fetchone()

        # Only admin can delete
        if not user or user["role"] != "admin":
            return jsonify({
                "message": "Only admin can delete content! ❌"
            }), 403

        # Find material
        cursor.execute(
            """
            SELECT file_path
            FROM study_material
            WHERE id = %s
            """,
            (material_id,)
        )

        material = cursor.fetchone()

        if not material:
            return jsonify({
                "message": "Study material not found!"
            }), 404

        # Delete database record
        cursor.execute(
            """
            DELETE FROM study_material
            WHERE id = %s
            """,
            (material_id,)
        )

        connection.commit()

        # Delete actual file
        file_path = os.path.join(
            app.config["UPLOAD_FOLDER"],
            material["file_path"]
        )

        if os.path.exists(file_path):
            os.remove(file_path)

        return jsonify({
            "message": "Study material deleted successfully! 🗑️"
        }), 200

    except Exception as error:

        print("Delete Error:", error)

        if connection:
            connection.rollback()

        return jsonify({
            "message": "Delete failed!"
        }), 500

    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()

# =========================
# LOGOUT
# =========================

@app.route("/logout", methods=["POST"])
def logout():

    session.clear()

    return jsonify({
        "message": "Logged out successfully! ✅"
    })


# =========================
# START SERVER
# =========================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )