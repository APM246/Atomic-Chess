from app.cli import clear_database
import os
import unittest
import datetime

from werkzeug.security import check_password_hash, generate_password_hash
from app import app, db
from app.models import Puzzle, PuzzleCompletion, Test, User
from app.auth import create_user
from app.api.puzzles_api import get_incomplete_puzzles_for_test, get_unique_puzzle_completions_for_test

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

        self.user1 = User(
            username="Test1",
            pwd_hash=generate_password_hash("password"),
            chess_beginner=True,
        )
        db.session.add(self.user1)
        self.user2 = User(
            username="Test2",
            pwd_hash=generate_password_hash("password1"),
            chess_beginner=False,
        )
        db.session.add(self.user2)

        self.puzzle1 = Puzzle(
            fen="",
            move_tree={},
            is_atomic=True,
            lesson_id=1,
        )
        db.session.add(self.puzzle1)
        self.puzzle2 = Puzzle(
            fen="",
            move_tree={},
            is_atomic=True,
            lesson_id=1,
        )
        db.session.add(self.puzzle2)
        self.puzzle3 = Puzzle(
            fen="",
            move_tree={},
            is_atomic=True,
            lesson_id=2,
        )
        db.session.add(self.puzzle3)
        self.puzzle4 = Puzzle(
            fen="",
            move_tree={},
            is_atomic=True,
            lesson_id=3,
        )
        db.session.add(self.puzzle4)
        db.session.commit()

        g.user = self.user1

    def tearDown(self):
        clear_database()
        db.session.remove()

    def test_puzzle_completion(self):
        test = Test(
            user=g.user.id,
            start_time=datetime.datetime.now()
        )
        db.session.add(test)
        db.session.commit()

        self.assertEqual(len(get_unique_puzzle_completions_for_test(test.id, g.user.id)), 0)
        self.assertEqual(len(get_incomplete_puzzles_for_test(test.id, g.user.id)), 4)

        db.session.add(PuzzleCompletion(
            user=g.user.id,
            puzzle_id=self.puzzle1.id,
            start_time=datetime.datetime.now(),
            end_time=datetime.datetime.now(),
            attempts=1,
            test_number=test.id,
        ))
        db.session.commit()

        self.assertEqual(len(get_unique_puzzle_completions_for_test(test.id, g.user.id)), 1)
        self.assertEqual(len(get_incomplete_puzzles_for_test(test.id, g.user.id)), 3)

        db.session.add(PuzzleCompletion(
            user=g.user.id,
            puzzle_id=self.puzzle1.id,
            start_time=datetime.datetime.now(),
            end_time=datetime.datetime.now(),
            attempts=3,
            test_number=test.id,
        ))
        db.session.commit()

        self.assertEqual(len(get_unique_puzzle_completions_for_test(test.id, g.user.id)), 1)
        self.assertEqual(len(get_incomplete_puzzles_for_test(test.id, g.user.id)), 3)

        db.session.add(PuzzleCompletion(
            user=g.user.id,
            puzzle_id=self.puzzle3.id,
            start_time=datetime.datetime.now(),
            end_time=datetime.datetime.now(),
            attempts=3,
            test_number=test.id,
        ))
        db.session.commit()

        self.assertEqual(len(get_unique_puzzle_completions_for_test(test.id, g.user.id)), 2)
        self.assertEqual(len(get_incomplete_puzzles_for_test(test.id, g.user.id)), 2)

        db.session.add(PuzzleCompletion(
            user=self.user2.id,
            puzzle_id=self.puzzle2.id,
            start_time=datetime.datetime.now(),
            end_time=datetime.datetime.now(),
            attempts=3,
            test_number=test.id,
        ))
        db.session.commit()

        self.assertEqual(len(get_unique_puzzle_completions_for_test(test.id, g.user.id)), 2)
        self.assertEqual(len(get_incomplete_puzzles_for_test(test.id, g.user.id)), 2)

        db.session.add(PuzzleCompletion(
            user=g.user.id,
            puzzle_id=self.puzzle2.id,
            start_time=datetime.datetime.now(),
            end_time=datetime.datetime.now(),
            attempts=3,
            test_number=test.id,
        ))
        db.session.commit()

        self.assertEqual(len(get_unique_puzzle_completions_for_test(test.id, g.user.id)), 3)
        self.assertEqual(len(get_incomplete_puzzles_for_test(test.id, g.user.id)), 1)

        db.session.add(PuzzleCompletion(
            user=g.user.id,
            puzzle_id=self.puzzle4.id,
            start_time=datetime.datetime.now(),
            end_time=datetime.datetime.now(),
            attempts=3,
            test_number=test.id,
        ))
        db.session.commit()

        self.assertEqual(len(get_unique_puzzle_completions_for_test(test.id, g.user.id)), 4)
        self.assertEqual(len(get_incomplete_puzzles_for_test(test.id, g.user.id)), 0)

if __name__ == "__main__":
    with app.app_context():
        unittest.main(verbosity=2)
