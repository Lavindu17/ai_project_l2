from flask import Flask
from flask_cors import CORS
from config import config
import os

def create_app(config_name='default'):
    """Application factory pattern"""
    # Get the project root directory (parent of app directory)
    basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    
    # Create Flask app with correct template and static folders
    app = Flask(__name__,
                template_folder=os.path.join(basedir, 'templates'),
                static_folder=os.path.join(basedir, 'static'))
    app.config.from_object(config[config_name])
    
    # Enable CORS
    CORS(app)
    
    # Register blueprints
    from app.routes.sprint import sprint_bp
    from app.routes.chat import chat_bp
    from app.routes.analysis import analysis_bp
    from app.routes.admin import admin_bp
    from app.routes.project import project_bp
    from app.routes.auth import auth_bp
    
    app.register_blueprint(sprint_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(project_bp)
    app.register_blueprint(auth_bp)
    
    # Home route
    @app.route('/')
    def home():
        return {
            'message': 'AI Sprint Retrospective System',
            'version': '1.0.0',
            'status': 'running'
        }
    
    return app
