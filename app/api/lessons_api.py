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

def update_lesson_completion(lesson_id, user_id, progression=None, is_complete=None):
    if progression is None and is_complete is None:
        return
    existing_completion = LessonCompletion.query.filter_by(lesson_id=lesson_id, user=user_id).first()
    if existing_completion is not None:
        if progression is not None:
            existing_completion.progression = progression
        if is_complete is not None:
            existing_completion.completed_test = is_complete
        db.session.commit()
    else:
        lesson_completion = LessonCompletion(
            user=user_id,
            lesson_id=lesson_id,
            progression=progression if progression is not None else 0,
            completed_test=is_complete if is_complete is not None else False,
        )
        db.session.add(lesson_completion)
        db.session.commit()

# Marks the lesson as complete for the given user
def mark_lesson_complete(lesson_id, user_id, progression=0):
    update_lesson_completion(lesson_id, user_id, progression=progression, is_complete=True)

def is_valid_progression(progression, max_progression):
    return progression >= 0 and progression <= max_progression

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
        is_complete = data.get("completed", None)
        progression = data.get("progression", None)
        if progression is not None and not is_valid_progression(progression, lesson.max_progression):
            return error_response(400, "Invalid value for field 'progression'")
        if is_complete is not None and not is_valid_complete(is_complete):
            return error_response(400, "Invalid value for field 'completed'")
        update_lesson_completion(lesson_id, g.user.id, progression=progression, is_complete=is_complete)
        return jsonify({ "status": "Ok" })
    lesson_data = {
        "id": lesson.id,
        "name": lesson.name,
        "description": lesson.description,
        "completed": False,
        "progression": 0
    }
    for lesson in g.user.lessons:
        if lesson.lesson_id == lesson_id:
            lesson_data["completed"] = lesson.completed_test
            lesson_data["progression"] = lesson.progression
            break
    return jsonify({ "lesson": lesson_data })
