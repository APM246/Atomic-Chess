import math
import datetime

from app.api.lessons_api import get_lesson_progression
from app.auth import admin_login_required
from flask import render_template, abort, redirect, request, url_for, g
from app import app, db
from app.models import Test, User, LessonCompletion, PuzzleCompletion
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
            if lesson.lesson_id == 0:
                completed_tests.add(0) # the first lesson dosent have a test, but the progress bar expects its "test" to be complete if the lesson is complete
        else:
            # Calculate the percentage progress through the lesson
            lesson_object = LESSONS_BY_ID[lesson.lesson_id]
            lesson_progressions[lesson.lesson_id] = math.ceil(lesson.progression * 100 / lesson_object.max_progression)

    test = Test.query.filter(Test.user==g.user.id, Test.end_time!=None).first()
    done_test = test is not None

    return render_template("learn.html", user=g.user, lessons=get_all_lessons(), completed_lessons=completed_lessons,
     completed_tests=completed_tests, lesson_progressions=lesson_progressions, done_test=done_test)

@app.route("/stats")
@login_required
def stats():
    """ Serves the stats page """
    num_users = User.get_num_users()
    percentage_beginners = User.get_percentage_chess_beginners()
    num_completed_lessons = g.user.get_num_completed_lessons()
    time_performance, num_completed_puzzles, total_num_completed_puzzles, accuracy = g.user.get_performance()
    best_users = Test.get_best_times()
    
    return render_template("stats.html", user=g.user, num_users=num_users, percentage_beginners=percentage_beginners,
    num_lessons=num_completed_lessons, time_performance=time_performance, lessons_by_id=LESSONS_BY_ID, 
    num_puzzles=num_completed_puzzles, total_num_completed_puzzles=total_num_completed_puzzles, accuracy=accuracy, best_users=best_users)

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
    finishedTest = int(request.args.get("finishedTest", 0))
    lesson_id = int(request.args.get("lesson", -1))
    lesson = LESSONS_BY_ID.get(lesson_id)
    puzzle_uri = url_for("random_puzzle_api", **request.args)
    test_id = None
    if lesson is None:
        # If we are doing the final test (no lesson) only use puzzles that have not been completed by the user
        test = Test(
            user=g.user.id,
            start_time=datetime.datetime.now(),
            end_time=None,
        )
        db.session.add(test)
        db.session.commit()
        test_id = test.id
        puzzle_uri = url_for("random_test_puzzle_api", test_id=test_id, **request.args)

    # Check that the lesson for this test has been completed
    lesson_model = LessonCompletion.query.filter_by(user=g.user.id, lesson_id=lesson_id).first()
    if lesson_id != -1:
        if lesson_model is None or not lesson_model.completed_lesson:
            # Forbidden
            return abort(403)

    title = lesson.name if lesson is not None else "Puzzles"

    if finishedTest == 1:
        return render_template("puzzle.html", user=g.user, finishedTest=finishedTest, lesson=lesson, puzzle_uri=puzzle_uri, test_id=test_id, title=title, save=(lesson is None))

    return render_template("puzzle.html", finishedTest=finishedTest, user=g.user, lesson=lesson, puzzle_uri=puzzle_uri, test_id=test_id, title=title, save=(lesson is None))

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
