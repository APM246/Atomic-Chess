from flask import jsonify, g, request
from app import app, db
from app.api.auth import api_login_required, error_response

DEFAULT_USER_SETTINGS = {
    "light_square_color": "#EEEEEE",
    "dark_square_color": "#4682B4",
    "light_square_highlight_color": "#F6F669",
    "dark_square_highlight_color": "#BACA2B",
    "show_move_markers": True,
    "show_square_highlights": True,
    "use_move_animations": True,
    "animation_time_ms": 300
}

@app.route("/api/settings", methods=["GET", "POST"])
@api_login_required
def get_settings():
    """ API route which handles personal user settings """
    if request.method == "POST":
        data = request.get_json()
        if data is None:
            return error_response(400, message="Invalid JSON data")
        settings = {}
        # Only assign valid keys obtained from DEFAULT_USER_SETTINGS
        for key in DEFAULT_USER_SETTINGS:
            if key in data:
                settings[key] = data[key]
        g.user.settings = settings
        db.session.commit()
        return error_response(200)

    # Return user settings - return default values if missing key
    settings = { **DEFAULT_USER_SETTINGS, **g.user.settings }
    return jsonify({ "settings": settings })

@app.route("/api/default_settings")
def get_default_settings():
    """ API route which returns the default settings """
    return jsonify({ "settings": DEFAULT_USER_SETTINGS })
