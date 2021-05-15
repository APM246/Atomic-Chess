from app.cli import clear_database
import os
import unittest
import datetime

from werkzeug.security import check_password_hash, generate_password_hash
from app import app, db
from app.models import Puzzle, PuzzleCompletion, User
from app.auth import create_user
from app.api.puzzles_api import get_all_incomplete_puzzles

from flask import g

BASEDIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_URI = "sqlite:///" + os.path.join(BASEDIR, "test.db")

def init_database():
    pass

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

    def test_unique_usernames(self):
        create_user("Username", "password", chess_beginner=False)
        self.assertRaises(Exception, create_user, "Username", "password", False)
        self.assertRaises(Exception, create_user, "Username", "password", False)
        db.session.rollback()
        create_user("Username1", "password", chess_beginner=False)
        create_user("User", "password", chess_beginner=False)
        create_user("Admin", "password", chess_beginner=False)
        self.assertRaises(Exception, create_user, "Admin", "new_password", False)
        db.session.rollback()

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

        self.puzzle1 = Puzzle(
            fen="",
            move_tree={},
            is_atomic=True,
            lesson_id=0,
        )
        db.session.add(self.puzzle1)
        self.puzzle2 = Puzzle(
            fen="",
            move_tree={},
            is_atomic=True,
            lesson_id=1,
        )
        db.session.add(self.puzzle2)

        db.session.commit()

        g.user = user1

    def tearDown(self):
        clear_database()
        db.session.remove()

    def test_puzzle_completion(self):
        self.assertEqual(len(get_all_incomplete_puzzles()), 2)
        db.session.add(PuzzleCompletion(
            user=2,
            puzzle_id=self.puzzle2.id,
            attempts=1,
            start_time=datetime.datetime.now(),
            end_time=datetime.datetime.now(),
        ))
        db.session.commit()
        self.assertEqual(len(get_all_incomplete_puzzles()), 2)
        db.session.add(PuzzleCompletion(
            user=1,
            puzzle_id=self.puzzle2.id,
            attempts=1,
            start_time=datetime.datetime.now(),
            end_time=datetime.datetime.now(),
        ))
        db.session.commit()
        self.assertEqual(len(get_all_incomplete_puzzles()), 1)
        db.session.add(PuzzleCompletion(
            user=1,
            puzzle_id=self.puzzle1.id,
            attempts=1,
            start_time=datetime.datetime.now(),
            end_time=datetime.datetime.now(),
        ))
        db.session.commit()
        # After all puzzles have been completed all are effectively incomplete again
        self.assertEqual(len(get_all_incomplete_puzzles()), 2)

if __name__ == "__main__":
    with app.app_context():
        unittest.main(verbosity=2)
