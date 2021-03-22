# Atomic Chess
Website designed to teach people how to play the chess variant [Atomic](https://en.wikipedia.org/wiki/Atomic_chess).

## Running locally:
1. Clone this repository.
2. Create a python virtual environment and install requirements.
`pip install virtualenv`
`python -m virtualenv venv`
`venv\Scripts\activate`
`pip install -r requirements.txt`
3. Run the webserver.
`SET FLASK_APP=atomic-chess`
`SET FLASK_ENV=development`
`flask run`
4. Navigate to [localhost:5000](http://localhost:5000)
