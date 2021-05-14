import math

from app.api.lessons_api import get_lesson_progression
from app.auth import admin_login_required
from flask import render_template, abort, redirect, request, url_for, g
from app import app, db
from app.models import User, LessonCompletion
from app.auth import login_required

from app.lessons import get_all_lessons, get_lesson_by_name, LESSONS_BY_ID

@app.route("/index")
@app.route("/")
def index():
    return render_template("index.html", user=g.user)

@app.route("/learn")
@login_required
def learn():
    # Query the database for which lessons have been completed
    completed_lessons = {}
    lesson_progressions = {}
    for lesson in g.user.lessons:
        if lesson.completed_test:
            completed_lessons[lesson.lesson_id] = True
            lesson_progressions[lesson.lesson_id] = 100
        else:
            lesson_object = LESSONS_BY_ID[lesson.lesson_id]
            lesson_progressions[lesson.lesson_id] = math.ceil(lesson.progression * 100 / lesson_object.max_progression)

    return render_template("learn.html", user=g.user, lessons=get_all_lessons(), completed_lesson_ids=completed_lessons, lesson_progressions=lesson_progressions)

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
    lesson = get_lesson_by_name(name)
    if lesson:
        return render_template(lesson.template, user=g.user, lesson_id=lesson.id)
    abort(404)

@app.route("/puzzle")
@login_required
def puzzle():
    lesson = LESSONS_BY_ID.get(int(request.args.get("lesson", -1)))
    title = lesson.name if lesson is not None else "Puzzles"
    return render_template("puzzle.html", user=g.user, puzzle_uri=url_for("random_puzzle_api", **request.args), title=title, save=(lesson is None))

# todo: unroute this in production 
@app.route("/test")
def test():
    return render_template("test_board.html")

@app.route("/create_puzzle")
@admin_login_required
@login_required
def create_puzzle():
    return render_template("create_puzzle.html", user=g.user, lessons=get_all_lessons())
