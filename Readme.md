[![Run-Tests](https://github.com/APM246/Atomic-Chess/actions/workflows/run-tests.yml/badge.svg)](https://github.com/APM246/Atomic-Chess/actions/workflows/run-tests.yml)
# Atomic Chess
Website designed to teach people how to play the chess variant [Atomic](https://en.wikipedia.org/wiki/Atomic_chess).

## Running locally:
1. Clone this repository.
2. Create a python virtual environment and install requirements.
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
2. `python -m tests.unittest`
### Selenium tests
If you are running on windows and have Chrome Version 90.0 you can run the system tests using the provided chromedriver
1. Activate virtualenv
2. Run the app using the instructions above
3. `python -m tests.systemtest`

## Running frontend tests:
1. Install NodeJS and npm
2. `cd tests`
3. `npm install`
4. `npm test`

