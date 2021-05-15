import functools

from flask import g, jsonify
from werkzeug.http import HTTP_STATUS_CODES

def error_response(error_code, message=None):
    """ Utility function which returns an error as JSON """
    response_data = {
        "error": HTTP_STATUS_CODES.get(error_code, "Unknown error")
    }
    if message is not None:
        response_data["message"] = message
    response = jsonify(response_data)
    response.status_code = error_code
    return response

def api_login_required(view):
    """ Decorator that ensures someone is authenticated via the API
    For now uses same authentication as normal login but could be extended to support tokens.
    """
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if (not "user" in g) or g.user is None:
            return error_response(401)
        return view(**kwargs)
    return wrapped_view

def api_admin_login_required(view):
    """ Decorator that ensures someone is authenticated via the API and is an admin user
    For now uses same authentication as normal login but could be extended to support tokens.
    """
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if (not "user" in g) or g.user is None or (not g.user.is_admin):
            return error_response(403)
        return view(**kwargs)
    return wrapped_view
