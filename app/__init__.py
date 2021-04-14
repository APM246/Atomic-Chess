import os
from flask import Flask, render_template, send_from_directory

STATIC_FILE_DIRECTORY = "static"
TEMPLATE_DIRECTORY = "templates"

app = Flask(__name__, instance_relative_config=True, template_folder=TEMPLATE_DIRECTORY, static_folder=STATIC_FILE_DIRECTORY)
app.config.from_mapping(
    SECRET_KEY="dev",
)

os.makedirs(app.instance_path, exist_ok=True)

from app import routes
