import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

STATIC_FILE_DIRECTORY = "static"
TEMPLATE_DIRECTORY = "templates"

app = Flask(__name__, instance_relative_config=True, template_folder=TEMPLATE_DIRECTORY, static_folder=STATIC_FILE_DIRECTORY)
basedir = os.path.abspath(os.path.dirname(__file__))
app.config.from_mapping(
    SECRET_KEY="dev",
    SQLALCHEMY_DATABASE_URI="sqlite:///" + os.path.join(basedir, "app.db"),
    SQLALCHEMY_TRACK_MODIFICATIONS = False,
)
os.makedirs(app.instance_path, exist_ok=True)

db = SQLAlchemy(app)
migrate = Migrate(app, db)

from app import routes, auth
from app.api import settings_api, lessons_api, puzzles_api, auth
from app.lessons import init

from app.db import init_db
app.cli.add_command(init_db)

init()
