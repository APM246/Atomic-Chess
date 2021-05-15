import json

from flask_sqlalchemy import sqlalchemy
from app import db
from datetime import datetime

# Column type that represents a JSON object stored as TEXT in the database
class JSONString(sqlalchemy.TypeDecorator):
	impl = sqlalchemy.types.TEXT

	def process_bind_param(self, value, dialect):
		if value is not None:
			value = json.dumps(value)
		return value

	def process_result_value(self, value, dialect):
		if value is not None:
			value = json.loads(value)
		return value

class User(db.Model):
	id = db.Column(db.Integer, primary_key=True)
	username = db.Column(db.String(80), unique=True, nullable=False)
	pwd_hash = db.Column(db.Text, nullable=False) # not sure what datatype this should be
	created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
	chess_beginner = db.Column(db.Boolean, nullable=False)
	is_admin = db.Column(db.Boolean, nullable=False, default=False)
	# Personal settings like board square colors, etc.
	settings = db.Column(JSONString, default={})

	# List of all LessonCompletions
	lessons = db.relationship("LessonCompletion", lazy=True)
	# List of all PuzzleCompletions
	completed_puzzles = db.relationship("PuzzleCompletion", lazy=True)

	def __repr__(self):
		return '<User %r>' % self.username

class LessonCompletion(db.Model):
	user = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True, nullable=False)
	lesson_id = db.Column(db.Integer, primary_key=True, nullable=False)
	# Arbitrary integer which represents the current progression through the puzzle
	# Intended to just be read and written to as a state variable (no associated logic)
	progression = db.Column(db.Integer, nullable=False)
	completed_test = db.Column(db.Boolean, nullable=False, default=False)
	completed_lesson = db.Column(db.Boolean, nullable=False, default=False)

class Puzzle(db.Model):
	id = db.Column(db.Integer, primary_key=True)
	# https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation
	# FEN string which represents the starting position of the puzzle
	fen = db.Column(db.Text, nullable=False)
	# JSON object which represents the tree of correct moves for the puzzle
	move_tree = db.Column(JSONString, nullable=False)
	is_atomic = db.Column(db.Boolean, nullable=False)
	# The lesson which this puzzle is associated with
	# Note that lessons are not stored in the database so this is not a foreign key
	lesson_id = db.Column(db.Integer, nullable=False)

	def to_json(self):
		""" Get a JSON representation for the puzzle """
		return {
			"id": self.id,
			"fen": self.fen,
			"move_tree": self.move_tree,
			"is_atomic": self.is_atomic,
			"lesson_id": self.lesson_id,
		}

class PuzzleCompletion(db.Model):
	user = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True, nullable=False)
	puzzle_id = db.Column(db.Integer, db.ForeignKey("puzzle.id"), primary_key=True, nullable=False)
	# Number of attempts before the puzzle was solved
	attempts = db.Column(db.Integer, nullable=False)
	# Times used to calculate the length of time taken to solve
	start_time = db.Column(db.DateTime, nullable=False)
	end_time = db.Column(db.DateTime, nullable=False)

	puzzle = db.relationship("Puzzle", lazy=True, uselist=False, backref="completions")
