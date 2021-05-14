from logging import error
import random
import datetime

from app.lessons import LESSONS_BY_ID
from flask import jsonify, g, request
from app import app, db
from app.api.auth import api_login_required, error_response
from app.models import LessonCompletion, Puzzle, PuzzleCompletion

def validate_puzzle_data(puzzle):
    if puzzle is None:
        return False
    return "fen" in puzzle and "move_tree" in puzzle and "is_atomic" in puzzle and "lesson_id" in puzzle

def validate_completion_data(data):
    if data is None:
        return False
    return "attempts" in data and "start_time" in data and "end_time" in data

def get_all_puzzles(lesson_id=None):
    if lesson_id is None:
        return Puzzle.query.all()
    return Puzzle.query.filter_by(lesson_id=lesson_id).all()

def get_all_incomplete_puzzles(lesson_id=None):
    query = Puzzle.query.outerjoin(PuzzleCompletion, (PuzzleCompletion.user==g.user.id) & (Puzzle.id==PuzzleCompletion.puzzle_id)).filter(PuzzleCompletion.puzzle_id==None)
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

@app.route("/api/puzzles/<int:puzzle_id>", methods=["POST"])
@api_login_required
def puzzle_api(puzzle_id):
    puzzle = Puzzle.query.filter_by(id=puzzle_id).first()
    current_completion = PuzzleCompletion.query.filter_by(user=g.user.id, puzzle_id=puzzle_id)
    if puzzle is not None and current_completion is None:
        data = request.get_json()
        if validate_completion_data(data):
            completion = PuzzleCompletion(
                user=g.user.id,
                puzzle_id=puzzle_id,
                attempts=data["attempts"],
                start_time=datetime.datetime.fromtimestamp(data["start_time"] / 1000),
                end_time=datetime.datetime.fromtimestamp(data["end_time"] / 1000),
            )
            db.session.add(completion)
            db.session.commit()
            return jsonify({ "status": "Ok" })
        return error_response(400)
    return error_response(404, message="Puzzle not found or already completed")

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
