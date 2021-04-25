from app import db
from datetime import datetime

class User(db.Model):
	id = db.Column(db.Integer, primary_key=True)
	username = db.Column(db.String(80), unique=True, nullable=False)
	pwd_hash = db.Column(db.Text, nullable=False) # not sure what datatype this should be
	created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
	chess_beginner = db.Column(db.Boolean, nullable=False)
	is_admin = db.Column(db.Boolean, nullable=False, default=False)
	settings = db.Column(db.Text)

	lessons = db.relationship("Lesson", lazy=True)
	completed_puzzles = db.relationship("PuzzleCompletion", lazy=True)

	def __repr__(self):
		return '<User %r>' % self.username

class Lesson(db.Model):
	user = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True, nullable=False)
	lesson_id = db.Column(db.Integer, primary_key=True, nullable=False)
	progression = db.Column(db.Integer, nullable=False)
	completed_test = db.Column(db.Boolean, nullable=False, default=False)

class Puzzle(db.Model):
	id = db.Column(db.Integer, primary_key=True)
	fen = db.Column(db.Text, nullable=False)
	move_tree = db.Column(db.Text, nullable=False)
	lesson_id = db.Column(db.Integer, nullable=False)

class PuzzleCompletion(db.Model):
	user = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True, nullable=False)
	puzzle_id = db.Column(db.Integer, db.ForeignKey("puzzle.id"), primary_key=True, nullable=False)
	attempts = db.Column(db.Integer, nullable=False)
	start_time = db.Column(db.DateTime, nullable=False)
	end_time = db.Column(db.DateTime, nullable=False)

	puzzle = db.relationship("Puzzle", lazy=True, uselist=False)