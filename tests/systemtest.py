import os
import unittest
import datetime

from werkzeug.security import check_password_hash, generate_password_hash
from app import app, db
from app.models import Puzzle, PuzzleCompletion, User
from app.api.puzzles_api import get_all_incomplete_puzzles
from app.cli import clear_database

from flask import g

from selenium import webdriver

BASEDIR = os.path.abspath(os.path.dirname(__file__))

class SystemTest(unittest.TestCase):
    def setUp(self):
        path = os.path.join(BASEDIR, "chromedriver.exe")
        self.driver = webdriver.Chrome(executable_path=path)
        if not self.driver:
            self.skipTest("Web browser not available")
        else:
            db.init_app(app)
            db.create_all()

            self.driver.maximize_window()
            self.driver.get("http://localhost:5000/")

    def tearDown(self):
        if self.driver:
            self.driver.close()
            db.session.commit()
            db.session.remove()
            clear_database()

    def test_register(self):
        self.driver.get("http://localhost:5000/register")
        self.driver.implicitly_wait(5)
        username_field = self.driver.find_element_by_id("username")
        password_field = self.driver.find_element_by_id("password")
        username_field.send_keys("Test")
        password_field.send_keys("password1")
        submit = self.driver.find_element_by_id("submit")
        self.driver.implicitly_wait(5)
        submit.click()
        self.driver.implicitly_wait(5)
        logout = self.driver.find_element_by_partial_link_text("Logout")
        self.assertEqual(logout.get_attribute("innerHTML").strip(), "Logout")

    def test_login(self):
        user = User(
            username="Admin",
            pwd_hash=generate_password_hash("password"),
            chess_beginner=False,
        )
        db.session.add(user)
        db.session.commit()

        self.driver.get("http://localhost:5000/login")
        self.driver.implicitly_wait(5)
        username_field = self.driver.find_element_by_id("username")
        password_field = self.driver.find_element_by_id("password")
        username_field.send_keys("Admin")
        password_field.send_keys("password")
        submit = self.driver.find_element_by_id("submit")
        self.driver.implicitly_wait(5)
        submit.click()
        self.driver.implicitly_wait(5)
        logout = self.driver.find_element_by_partial_link_text("Logout")
        self.assertEqual(logout.get_attribute("innerHTML").strip(), "Logout")

    def test_learn(self):
        user = User(
            username="Admin",
            pwd_hash=generate_password_hash("password"),
            chess_beginner=False,
        )
        db.session.add(user)
        db.session.commit()

        self.driver.get("http://localhost:5000/learn")
        self.driver.implicitly_wait(5)
        # We should be redirected to login page
        username_field = self.driver.find_element_by_id("username")
        password_field = self.driver.find_element_by_id("password")
        username_field.send_keys("Admin")
        password_field.send_keys("password")
        submit = self.driver.find_element_by_id("submit")
        self.driver.implicitly_wait(5)
        submit.click()
        self.driver.implicitly_wait(5)
        logout = self.driver.find_element_by_partial_link_text("Logout")
        self.assertEqual(logout.get_attribute("innerHTML").strip(), "Logout")
        self.assertEqual(self.driver.current_url, "http://localhost:5000/learn")
        self.driver.implicitly_wait(5)

        begin = self.driver.find_element_by_partial_link_text("Begin Lesson")
        begin.click()
        self.driver.implicitly_wait(5)
        self.assertEqual(self.driver.current_url, "http://localhost:5000/lessons/Chess")

if __name__ == "__main__":
    unittest.main(verbosity=2)
