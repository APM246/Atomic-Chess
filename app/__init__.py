import os
from flask import Flask, render_template, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

STATIC_FILE_DIRECTORY = "static"
TEMPLATE_DIRECTORY = "templates"

app = Flask(__name__, instance_relative_config=True, template_folder=TEMPLATE_DIRECTORY, static_folder=STATIC_FILE_DIRECTORY)
app.config.from_mapping(
    SECRET_KEY="dev",
    SQLALCHEMY_DATABASE_URI="sqlite:///" + os.path.join(os.path.abspath(app.instance_path), "test.db"),
    SQLALCHEMY_TRACK_MODIFICATIONS = False,
)

db = SQLAlchemy(app)
migrate = Migrate(app, db)

os.makedirs(app.instance_path, exist_ok=True)

from app import routes, models
