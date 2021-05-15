from app.lessons import LESSONS_BY_ID
from flask import jsonify, g, request
from app import app, db
from app.api.auth import api_login_required, error_response
from app.models import LessonCompletion

def get_lesson_progression(lesson_id, user_id):
    completion = LessonCompletion.query.filter_by(lesson_id=lesson_id, user=user_id).first()
    if completion is None:
        return 0
    return completion.progression

def update_lesson_completion(lesson_id, user_id, progression=None, completed_lesson=None, completed_test=None):
    existing_completion = LessonCompletion.query.filter_by(lesson_id=lesson_id, user=user_id).first()
    if existing_completion is not None:
        if progression is not None:
            existing_completion.progression = progression
        if completed_lesson is not None:
            existing_completion.completed_lesson = completed_lesson
        if completed_test is not None:
            existing_completion.completed_test = completed_test
        db.session.commit()
    else:
        lesson_completion = LessonCompletion(
            user=user_id,
            lesson_id=lesson_id,
            progression=progression if progression is not None else 0,
            completed_lesson=completed_lesson if completed_lesson is not None else False,
            completed_test=completed_test if completed_test is not None else False
        )
        db.session.add(lesson_completion)
        db.session.commit()

# Marks the lesson (and the test for that lesson) as complete for the given user
def mark_lesson_complete(lesson_id, user_id, progression=0):
    update_lesson_completion(lesson_id, user_id, progression=progression, completed_lesson=True, completed_test=True)

def is_valid_progression(progression, max_progression):
    return progression >= 0 and progression < max_progression

def is_valid_complete(is_complete):
    return is_complete is True or is_complete is False

@app.route("/api/lessons/<int:lesson_id>", methods=["GET", "PUT"])
@api_login_required
def lesson_api(lesson_id):
    lesson = LESSONS_BY_ID.get(lesson_id, None)
    if not lesson:
        return error_response(404)
    if request.method == "PUT":
        data = request.get_json()
        if not data:
            return error_response(400)

        completed_lesson = data.get("completed_lesson", None)
        completed_test = data.get("completed_test", None)
        progression = data.get("progression", None)

        if progression is not None and not is_valid_progression(progression, lesson.max_progression):
            return error_response(400, "Invalid value for field 'progression'")
        if completed_lesson is not None and not is_valid_complete(completed_lesson):
            return error_response(400, "Invalid value for field 'completed_lesson'")
        if completed_test is not None and not is_valid_complete(completed_test):
            return error_response(400, "Invalid value for field 'completed_test'")

        update_lesson_completion(lesson_id, g.user.id, progression=progression, completed_lesson=completed_lesson, completed_test=completed_test)
        return jsonify({"status": "Ok"})

    lesson_data = {
        "id": lesson.id,
        "name": lesson.name,
        "description": lesson.description,
        "completed_test": False,
        "completed_lesson": False,
        "progression": 0
    }
    for lesson in g.user.lessons:
        if lesson.lesson_id == lesson_id:
            lesson_data["completed_lesson"] = lesson.completed_lesson
            lesson_data["completed_test"] = lesson.completed_test
            lesson_data["progression"] = lesson.progression
            break
    return jsonify({ "lesson": lesson_data })
