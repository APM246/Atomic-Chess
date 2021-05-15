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
    """ Serves the home page """
    return render_template("index.html", user=g.user)

@app.route("/learn")
@login_required
def learn():
    """ Serves the learn page """
    # Query the database for which lessons have been completed
    completed_lessons = set()
    completed_tests = set()
    lesson_progressions = {}
    for lesson in g.user.lessons:
        if lesson.completed_test:
            completed_tests.add(lesson.lesson_id)

        if lesson.completed_lesson:
            completed_lessons.add(lesson.lesson_id)
            lesson_progressions[lesson.lesson_id] = 100
        else:
            # Calculate the percentage progress through the lesson
            lesson_object = LESSONS_BY_ID[lesson.lesson_id]
            lesson_progressions[lesson.lesson_id] = math.ceil(lesson.progression * 100 / lesson_object.max_progression)

    return render_template("learn.html", user=g.user, lessons=get_all_lessons(), completed_lessons=completed_lessons, completed_tests=completed_tests, lesson_progressions=lesson_progressions)

@app.route("/stats")
@login_required
def stats():
    """ Serves the stats page """
    return render_template("stats.html", user=g.user)

@app.route("/settings")
@login_required
def settings():
    """ Serves the settings page """
    return render_template("settings.html", user=g.user)

@app.route("/lessons/<string:name>")
@login_required
def lessons(name):
    """ Serves a specific lesson page """
    lesson = get_lesson_by_name(name)
    if lesson:
        return render_template(lesson.template, user=g.user, lesson_id=lesson.id)
    abort(404)

@app.route("/puzzle")
@login_required
def puzzle():
    """ Serves the puzzles page, either for a mini-test or the final test """
    lesson_id = int(request.args.get("lesson", -1))
    lesson = LESSONS_BY_ID.get(lesson_id)
    # If we are doing the final test (no lesson) only use puzzles that have not been completed by the user
    puzzle_uri = url_for("random_puzzle_api", **request.args) if lesson is not None else url_for("random_incomplete_puzzle_api", **request.args)

    # Check that the lesson for this test has been completed
    lesson_model = LessonCompletion.query.filter_by(user=g.user.id, lesson_id=lesson_id).first()
    if lesson_model is None or not lesson_model.completed_lesson:
        # Forbidden
        return abort(403)

    title = lesson.name if lesson is not None else "Puzzles"
    return render_template("puzzle.html", user=g.user, lesson=lesson, puzzle_uri=puzzle_uri, title=title, save=(lesson is None))

# todo: unroute this in production 
@app.route("/test")
def test():
    return render_template("test_board.html")

@app.route("/create_puzzle")
@admin_login_required
@login_required
def create_puzzle():
    """ Serves admin only create puzzle page """
    return render_template("create_puzzle.html", user=g.user, lessons=get_all_lessons())
