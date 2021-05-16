from logging import error
import random
import datetime

from app.lessons import LESSONS_BY_ID
from flask import jsonify, g, request
from app import app, db
from app.api.auth import api_admin_login_required, api_login_required, error_response
from app.models import Puzzle, PuzzleCompletion, Test
from flask_sqlalchemy import sqlalchemy

PUZZLES_PER_TEST = 5

def validate_puzzle_data(puzzle):
    """ Validate puzzle data from client """
    if puzzle is None:
        return False
    return "fen" in puzzle and "move_tree" in puzzle and "is_atomic" in puzzle and "lesson_id" in puzzle

def validate_completion_data(data):
    """ Validate completion data """
    if data is None:
        return False
    return "attempts" in data and "start_time" in data and "end_time" in data and "test_id" in data

def get_all_puzzles(lesson_id=None):
    """ Returns all puzzles for a given lesson, if lesson_id==None, returns all puzzles """
    if lesson_id is None:
        return Puzzle.query.all()
    return Puzzle.query.filter_by(lesson_id=lesson_id).all()

def get_incomplete_puzzles_for_test(test_id, user_id):
    query = Puzzle.query.outerjoin(PuzzleCompletion, (Puzzle.id==PuzzleCompletion.puzzle_id) & (PuzzleCompletion.test_number==test_id) & (PuzzleCompletion.user==user_id)).filter(PuzzleCompletion.id==None)
    return query.all()

def get_unique_puzzle_completions_for_test(test_id, user_id):
    return PuzzleCompletion.query.filter_by(test_number=test_id, user=user_id).group_by(PuzzleCompletion.puzzle_id).all()

@app.route("/api/puzzles/random")
@api_login_required
def random_puzzle_api():
    """ API route which serves a random puzzle
    Accepts a query parameter ?lesson to select puzzles for a given lesson
    """
    lesson_id = request.args.get("lesson")
    puzzles = get_all_puzzles(lesson_id=lesson_id)
    if len(puzzles) > 0:
        return jsonify({ "puzzle": random.choice(puzzles).to_json() })
    return jsonify({ "puzzle": None })

@app.route("/api/puzzles/test/<int:test_id>")
@api_login_required
def random_test_puzzle_api(test_id):
    """ API route which serves a random puzzle that hasn't been completed by the current user """
    puzzles = get_incomplete_puzzles_for_test(test_id, g.user.id)
    if len(puzzles) > 0:
        return jsonify({ "puzzle": random.choice(puzzles).to_json(), "is_final": len(get_unique_puzzle_completions_for_test(test_id, g.user.id)) >= (PUZZLES_PER_TEST - 1) })
    return jsonify({ "puzzle": None, "is_final": True })

@app.route("/api/tests/<int:test_id>", methods=["POST"])
@api_login_required
def test_api(test_id):
    test = Test.query.filter_by(id=test_id).first()
    if test is not None:
        # TODO: assert that there are 10 puzzle completions for this test
        test.end_time = datetime.datetime.now()
        db.session.commit()
    return error_response(404)

@app.route("/api/puzzles/<int:puzzle_id>", methods=["POST"])
@api_login_required
def puzzle_api(puzzle_id):
    """ API route which allows updating the completion of a puzzle """
    puzzle = Puzzle.query.filter_by(id=puzzle_id).first()
    if puzzle is not None:
        data = request.get_json()
        if validate_completion_data(data):
            completion = PuzzleCompletion(
                user=g.user.id,
                puzzle_id=puzzle_id,
                attempts=data["attempts"],
                start_time=datetime.datetime.fromtimestamp(data["start_time"] / 1000),
                end_time=datetime.datetime.fromtimestamp(data["end_time"] / 1000),
                test_number=data["test_id"],
            )
            db.session.add(completion)
            db.session.commit()
            return jsonify({ "status": "Ok" })
        return error_response(400)
    return error_response(404, message="Puzzle not found or already completed")

@app.route("/api/puzzles", methods=["GET"])
@api_login_required
def puzzles_api():
    """ API route which serves all puzzle data """
    lesson_id = request.args.get("lesson")
    puzzles = get_all_puzzles(lesson_id=lesson_id)
    return jsonify({ "puzzles": list(map(lambda puzzle: puzzle.to_json(), puzzles)) })

@app.route("/api/puzzles", methods=["POST"])
@api_admin_login_required
@api_login_required
def puzzles_post_api():
    """ API route used to create a new puzzle from the create_puzzle page """
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
