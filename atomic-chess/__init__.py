import os
from flask import Flask, render_template

STATIC_FILE_DIRECTORY = "static"
TEMPLATE_DIRECTORY = "templates"

def create_app():
    app = Flask(__name__, instance_relative_config=True, template_folder=TEMPLATE_DIRECTORY)
    app.config.from_mapping(
        SECRET_KEY="dev",
    )

    os.makedirs(app.instance_path, exist_ok=True)

    @app.route("/")
    def index():
        return render_template("index.html")

    return app
