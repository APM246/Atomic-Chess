from app.cli import clear_database
import os
import unittest
import datetime

from werkzeug.security import check_password_hash, generate_password_hash
from app import app, db
from app.models import Puzzle, PuzzleCompletion, User
from app.api.puzzles_api import get_all_incomplete_puzzles

from flask import g

BASEDIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_URI = "sqlite:///" + os.path.join(BASEDIR, "test.db")

class UserModelCase(unittest.TestCase):
    def setUp(self):
        app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URI
        self.app = app.test_client()
        db.create_all()

        user = User(
            username="Test",
            pwd_hash=generate_password_hash("password"),
            chess_beginner=True,
        )
        db.session.add(user)
        db.session.commit()

    def tearDown(self):
        clear_database()
        db.session.remove()

    def test_json_field(self):
        fetched_user = User.query.filter_by(username="Test").first()
        self.assertIsNotNone(fetched_user)
        self.assertEqual(fetched_user.settings, {})

    def test_password_hashing(self):
        fetched_user = User.query.filter_by(username="Test").first()
        self.assertIsNotNone(fetched_user)
        self.assertTrue(check_password_hash(fetched_user.pwd_hash, "password"))
        self.assertFalse(check_password_hash(fetched_user.pwd_hash, "password1"))
        self.assertFalse(check_password_hash(fetched_user.pwd_hash, "random_password"))

class PuzzleTestCase(unittest.TestCase):
    def setUp(self):
        app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URI
        self.app = app.test_client()
        db.create_all()

        user1 = User(
            username="Test1",
            pwd_hash=generate_password_hash("password"),
            chess_beginner=True,
        )
        db.session.add(user1)
        user2 = User(
            username="Test2",
            pwd_hash=generate_password_hash("password1"),
            chess_beginner=False,
        )
        db.session.add(user2)

        puzzle1 = Puzzle(
            fen="",
            move_tree={},
            is_atomic=True,
            lesson_id=0,
        )
        db.session.add(puzzle1)
        puzzle2 = Puzzle(
            fen="",
            move_tree={},
            is_atomic=True,
            lesson_id=1,
        )
        db.session.add(puzzle2)

        db.session.commit()

        g.user = user1

    def tearDown(self):
        clear_database()
        db.session.remove()

    def test_puzzle_completion(self):
        self.assertEqual(len(get_all_incomplete_puzzles()), 2)
        db.session.add(PuzzleCompletion(
            user=2,
            puzzle_id=2,
            attempts=1,
            start_time=datetime.datetime.now(),
            end_time=datetime.datetime.now(),
        ))
        db.session.commit()
        self.assertEqual(len(get_all_incomplete_puzzles()), 2)
        db.session.add(PuzzleCompletion(
            user=1,
            puzzle_id=2,
            attempts=1,
            start_time=datetime.datetime.now(),
            end_time=datetime.datetime.now(),
        ))
        db.session.commit()
        self.assertEqual(len(get_all_incomplete_puzzles()), 1)
        db.session.add(PuzzleCompletion(
            user=1,
            puzzle_id=1,
            attempts=1,
            start_time=datetime.datetime.now(),
            end_time=datetime.datetime.now(),
        ))
        db.session.commit()
        self.assertEqual(len(get_all_incomplete_puzzles()), 0)

if __name__ == "__main__":
    with app.app_context():
        unittest.main(verbosity=2)
