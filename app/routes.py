from flask import render_template, abort
from app import app

@app.route("/index")
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/learn")
def learn():
    return render_template("learn.html")

@app.route("/stats")
def stats():
    return render_template("stats.html")

@app.route("/settings")
def settings():
    return render_template("settings.html")

LESSON_NAME_MAP = {
    "intro": "lessons/lesson0.html"
}

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
