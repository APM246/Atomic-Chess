import os
from flask import Flask, render_template, send_from_directory

STATIC_FILE_DIRECTORY = "static"
TEMPLATE_DIRECTORY = "templates"

def create_app():
    app = Flask(__name__, instance_relative_config=True, template_folder=TEMPLATE_DIRECTORY, static_folder=STATIC_FILE_DIRECTORY)
    app.config.from_mapping(
        SECRET_KEY="dev",
    )

    os.makedirs(app.instance_path, exist_ok=True)

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/learn")
    def learn():
        return render_template("learn.html")
    
    @app.route("/stats")
    def stats():
        return render_template("stats.html")
    
    @app.route("/settings")
    def settings():
        return render_template("settings.html")

    return app
