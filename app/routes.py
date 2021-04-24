from flask import render_template, abort
from app import app

@app.route("/index")
@app.route("/")
def index():
    return render_template("index.html")

lesson_names = ["Rules", "Win Conditions", "Opening Traps", "Checks", "Piece Saftey", "Kings Touching"]
@app.route("/learn")
def learn():
    lesson_descriptions = [
        "Learn the rules of Atomic Chess and how they differ from traditional chess",
        "In Atomic Chess you can win by checkmate, but can also win by blowing up the enemy king. This lesson will teach you how this effects the game",
        "White has many traps they can set in the opening, learn these traps to crush your oppenent!",
        "Unlike traditional chess, if you are put in check, you dont have to move out of it if you can blow up the king. This lesson will show you some examples",
        "TODO",
        "Kings can touch each other in Atomic Chess! This lesson teaches you the consequences of this strange rule"]

    # todo: Query the database for which lessons have been completed
    completed_lessons = [True, True, False, False, True, False]

    return render_template("learn.html", lessonNames=lesson_names, lessonDescriptions=lesson_descriptions, completedLessons=completed_lessons, zip=zip)

@app.route("/stats")
def stats():
    return render_template("stats.html")

@app.route("/settings")
def settings():
    return render_template("settings.html")

LESSON_NAME_MAP = {
    "intro": "lessons/lesson0.html"
}
LESSON_NAME_MAP.update({name: "lessons/lesson{}.html".format(i) for i, name in enumerate(lesson_names, 1)})

@app.route("/lessons/<string:name>")
def lessons(name):
    if name in LESSON_NAME_MAP:
        return render_template(LESSON_NAME_MAP[name])
    abort(404)
