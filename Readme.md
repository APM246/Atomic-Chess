[![Run-Tests](https://github.com/APM246/Atomic-Chess/actions/workflows/run-tests.yml/badge.svg)](https://github.com/APM246/Atomic-Chess/actions/workflows/run-tests.yml)

# Atomic Chess

Website designed to teach people how to play the chess variant [Atomic](https://en.wikipedia.org/wiki/Atomic_chess).


## Running locally:

1. Clone this repository.

2. Create a python virtual environment and install requirements. (note: webapp was developed on python version 3.9.2)

`pip install virtualenv`

`python -m virtualenv venv`

`venv\Scripts\activate`

`pip install -r requirements.txt`

3. Configure environment

`SET FLASK_APP=app`

`SET FLASK_ENV=development`

4. Initialize database (this will prompt you to create an admin account)

`flask db upgrade`

`flask init-db`

5. Run server

`flask run`

6. Navigate to [localhost:5000](http://localhost:5000)

  
## Running backend tests:

1. Activate virtualenv as above

2.  `python -m tests.unittest`

### Selenium tests

If you are running on windows and have Chrome Version 90.0 you can run the system tests using the provided chromedriver

1. Activate virtualenv

2. Run the app using the instructions above

3.  `python -m tests.systemtest`


## Running frontend tests:

1. Install NodeJS and npm

2.  `cd tests`

3.  `npm install`

4.  `npm test`

# Project
### Purpose
The purpose of the web application is to teach people the basics of playing Atomic Chess. It is targeted at people who have basic experience with classic chess and walks them through the key differences between Atomic and regular chess as well as some of the key ideas of Atomic.

Users learn the concepts of Atomic chess by being interactively guided through a series of situations which players will encounter while playing Atomic.

During the assessment, users use the concepts they have learnt to play through realistic scenarios designed to test a specific Atomic concept, for example, the different ways to win the game. Users are rewarded based on how well they handle various situations as well as how quickly they can do it.
### Architecture
The application is implemented as a flask web server. It supports the creation of user accounts to track the user's learning progress as they complete lessons and assessments. The server tracks which lessons and assessments have been completed and displays this information to the user. Once the user begins a lesson the client handles the logic which progresses them through the lesson, making AJAX calls to save progress.

The assessments are implemented as a single page which makes an AJAX call to request a new assessment for the user to complete. Once the user has completed the assessment the client sends an AJAX request to the server indicating that it has been completed and requests a new assessment. Note that currently, the server doesn't validate that the assessment was actually completed correctly, it is up to the client to validate. This is fine for now as there is no need to prevent cheating as it is a learning site.

Once the assessment is completed, the user is given a basic summary of their performance and is routed to a stats page where they can see more detailed information. The stats page also shows global statistics and a leaderboard of the fastest users to complete the assessment.

### Tests
A variety of tests were implemented including unit tests on the database schema, front-end tests using Selenium Web Driver and HTML/CSS validation.

Firstly in the unit tests the User table in the database was tested, ensuring user details such as password hashes are stored correctly and validation occurs for incorrectly entered usernames/passwords. The Puzzle, PuzzleCompletion and Test models were also tested on the correct storage of data once a user completes an individual puzzle within the final assessment.

In the Selenium system tests, login and registering were tested by checking if the website rendered a Logout button and if certain account-restricted pages were accessible.
