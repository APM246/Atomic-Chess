from flask import render_template, abort, redirect, request, url_for, g
from app import app, db
from app.models import User, Lesson
from app.auth import login_required

@app.route("/index")
@app.route("/")
def index():
    return render_template("index.html", user=g.user)

LESSON_NAMES = ["Chess", "Atomic", "Win Conditions", "Opening Traps", "Checks", "Piece Saftey", "Kings Touching"]
NUM_LESSONS = len(LESSON_NAMES)
LESSON_NAME_MAP = { name: "lessons/lesson{}.html".format(i) for i, name in enumerate(LESSON_NAMES) }

@app.route("/learn")
@login_required
def learn():
    lesson_descriptions = [
        "Never played chess before? This lesson will go through the basics of chess",
        "Learn the rules of Atomic Chess and how they differ from traditional chess",
        "In Atomic Chess you can win by checkmate, but can also win by blowing up the enemy king. This lesson will teach you how this effects the game",
        "White has many traps they can set in the opening, learn these traps to crush your oppenent!",
        "Unlike traditional chess, if you are put in check, you dont have to move out of it if you can blow up the king. This lesson will show you some examples",
        "TODO",
        "Kings can touch each other in Atomic Chess! This lesson teaches you the consequences of this strange rule"]

    # Query the database for which lessons have been completed
    completed_lessons = [False] * NUM_LESSONS
    for lesson in g.user.lessons:
        if lesson.completed_test:
            completed_lessons[lesson.lesson_id] = True

    return render_template("learn.html", user=g.user, lesson_names=LESSON_NAMES, lesson_descriptions=lesson_descriptions, completed_lessons=completed_lessons, zip=zip)

@app.route("/stats")
@login_required
def stats():
    return render_template("stats.html", user=g.user)

@app.route("/settings")
@login_required
def settings():
    return render_template("settings.html", user=g.user)

@app.route("/lessons/<string:name>")
@login_required
def lessons(name):
    if name in LESSON_NAME_MAP:
        return render_template(LESSON_NAME_MAP[name], user=g.user)
    abort(404)
