import random

from app.lessons import LESSONS_BY_ID
from flask import jsonify, g, request
from app import app, db
from app.api.auth import api_login_required, error_response
from app.models import LessonCompletion, Puzzle, PuzzleCompletion

def validate_puzzle_data(puzzle):
    if puzzle is None:
        return False
    return "fen" in puzzle and "move_tree" in puzzle and "is_atomic" in puzzle and "lesson_id" in puzzle

def get_all_puzzles(lesson_id=None):
    if lesson_id is None:
        return Puzzle.query.all()
    return Puzzle.query.filter_by(lesson_id=lesson_id).all()

def get_all_incomplete_puzzles(lesson_id=None):
    query = Puzzle.query.outerjoin(PuzzleCompletion, Puzzle.id==PuzzleCompletion.puzzle_id & PuzzleCompletion.user==g.user.id).filter(PuzzleCompletion.puzzle_id==None)
    if lesson_id is not None:
        query = query.filter(Puzzle.lesson_id==lesson_id)
    return query.all()

@app.route("/api/puzzles/random")
@api_login_required
def random_puzzle_api():
    lesson_id = request.args.get("lesson")
    puzzles = get_all_incomplete_puzzles(lesson_id=lesson_id)
    if len(puzzles) > 0:
        return jsonify({ "puzzle": random.choice(puzzles).to_json() })
    return jsonify({ "puzzle": None })

@app.route("/api/puzzles", methods=["GET"])
@api_login_required
def puzzles_api():
    lesson_id = request.args.get("lesson")
    puzzles = get_all_puzzles(lesson_id=lesson_id)
    return jsonify({ "puzzles": list(map(lambda puzzle: puzzle.to_json(), puzzles)) })

@app.route("/api/puzzles", methods=["POST"])
@api_login_required
def puzzles_post_api():
    data = request.get_json()
    if validate_puzzle_data(data):
        puzzle = Puzzle(
            fen=data["fen"],
            move_tree=data["move_tree"],
            is_atomic=data["is_atomic"],
            lesson_id=data["lesson_id"],
        )
        db.session.add(puzzle)
        db.session.commit()
        return jsonify({ "status": "Ok" })
    return error_response(400)
