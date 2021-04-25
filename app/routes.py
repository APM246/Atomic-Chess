from flask import render_template, abort, flash, redirect, request, url_for
from app import app
from app.forms import SignUpForm, LoginForm

@app.route("/index")
@app.route("/")
def index():
    return render_template("index.html")

LESSON_NAMES = ["Chess", "Atomic", "Win Conditions", "Opening Traps", "Checks", "Piece Saftey", "Kings Touching"]
LESSON_NAME_MAP = {name: "lessons/lesson{}.html".format(i) for i, name in enumerate(LESSON_NAMES)}

@app.route("/learn")
def learn():
    lesson_descriptions = [
        "Never played chess before? This lesson will go through the basics of chess",
        "Learn the rules of Atomic Chess and how they differ from traditional chess",
        "In Atomic Chess you can win by checkmate, but can also win by blowing up the enemy king. This lesson will teach you how this effects the game",
        "White has many traps they can set in the opening, learn these traps to crush your oppenent!",
        "Unlike traditional chess, if you are put in check, you dont have to move out of it if you can blow up the king. This lesson will show you some examples",
        "TODO",
        "Kings can touch each other in Atomic Chess! This lesson teaches you the consequences of this strange rule"]

    # TODO: Query the database for which lessons have been completed
    completed_lessons = [True, True, False, False, True, False]

    return render_template("learn.html", lesson_names=LESSON_NAMES, lesson_descriptions=lesson_descriptions, completed_lessons=completed_lessons, zip=zip)

@app.route("/stats")
def stats():
    return render_template("stats.html")

@app.route("/settings")
def settings():
    return render_template("settings.html")

def prepare_settings(settings_json):
    # Jinja seems to just do simple text replacement (ie. Doesn't convert from python True to js true)
    settings_copy = { **settings_json }
    for key in settings_copy:
        if settings_copy[key] == True:
            settings_copy[key] = "true"
        elif settings_copy[key] == False:
            settings_copy[key] = "false"
    return settings_copy

# TODO: Lookup user settings in database
def get_board_settings(user):
    return prepare_settings({
        "light_square_color": "#EEEEEE",
        "dark_square_color": "#4682B4",
        "light_square_highlight_color": "#F6F669",
        "dark_square_highlight_color": "#BACA2B",
        "show_move_markers": True,
        "show_square_highlights": True,
        "use_move_animations": True,
        "animation_time_ms": 300,
    })

@app.route("/lessons/<string:name>")
def lessons(name):
    if name in LESSON_NAME_MAP:
        return render_template(LESSON_NAME_MAP[name], board_settings=get_board_settings(user=None))
    abort(404)

@app.route("/register", methods=['GET', 'POST'])
def register():
    form = SignUpForm(request.form)
    if form.validate_on_submit():
        return redirect(url_for('login'))
    return render_template('register.html', form=form)

@app.route("/login", methods=['GET', 'POST'])
def login():
    form = LoginForm(request.form)
    if form.validate_on_submit():
        return redirect(url_for('index'))
    return render_template('login.html', form=form)
