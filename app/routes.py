from flask import render_template, abort
from app import app

@app.route("/index")
@app.route("/")
def index():
    return render_template("index.html")

lessonNames = ["Rules", "Win Conditions", "Opening Traps", "Checks", "Piece Saftey", "Kings Touching"]
@app.route("/learn")
def learn():
    lessonDescriptions = ["Short Description of lesson here"] * len(lessonNames)

    # todo: Query the database for which lessons have been completed
    completedLessons = [True, True, False, False, True, False]

    return render_template("learn.html", lessonNames=lessonNames, lessonDescriptions=lessonDescriptions, completedLessons=completedLessons, zip=zip)

@app.route("/stats")
def stats():
    return render_template("stats.html")

@app.route("/settings")
def settings():
    return render_template("settings.html")

LESSON_NAME_MAP = {
    "intro": "lessons/lesson0.html"
}
LESSON_NAME_MAP.update({name: "lessons/lesson{}.html".format(i) for i, name in enumerate(lessonNames, 1)})

@app.route("/lessons/<string:name>")
def lessons(name):
    if name in LESSON_NAME_MAP:
        return render_template(LESSON_NAME_MAP[name])
    abort(404)
