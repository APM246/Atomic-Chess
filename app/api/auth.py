import functools

from flask import g, jsonify
from werkzeug.http import HTTP_STATUS_CODES

def error_response(error_code, message=None):
    response_data = {
        "error": HTTP_STATUS_CODES.get(error_code, "Unknown error")
    }
    if message is not None:
        response_data["message"] = message
    response = jsonify(response_data)
    response.status_code = error_code
    return response

def api_login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if "user" in g and g.user is None:
            return error_response(401)
        return view(**kwargs)
    return wrapped_view
