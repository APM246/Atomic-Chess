from flask import render_template, abort
from app import app

@app.route("/index")
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

LESSON_NAME_MAP = {
    "intro": "lessons/lesson0.html"
}

@app.route("/lesson/<string:name>")
def lesson(name):
    if name in LESSON_NAME_MAP:
        return render_template(LESSON_NAME_MAP[name])
    abort(404)
