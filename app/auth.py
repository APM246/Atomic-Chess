import functools
import re

from flask import render_template, abort, flash, redirect, request, url_for, session, g
from app import app, db
from app.models import User, LessonCompletion
from app.forms import SignUpForm, LoginForm
from app.lessons import LESSON_INTRO
from app.api.lessons_api import mark_lesson_complete
from werkzeug.security import check_password_hash, generate_password_hash

@app.before_request
def load_logged_in_user():
    user_id = session.get("current_user")
    if user_id is None:
        g.user = None
    else:
        g.user = User.query.get(user_id)

def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            return redirect(url_for("login", next=url_for(request.endpoint, **request.view_args)))
        return view(**kwargs)
    return wrapped_view

def admin_login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if (not "user" in g) or g.user is None or (not g.user.is_admin):
            return redirect(url_for("login", next=url_for(request.endpoint, **request.view_args)))
        return view(**kwargs)
    return wrapped_view

@app.route("/register", methods=['GET', 'POST'])
def register():
    form = SignUpForm(request.form)
    if form.validate_on_submit():
        # Check if username exists
        user = User.query.filter_by(username=form.username.data).first()
        if user is not None:
            flash("Username already taken")
            return render_template('register.html', form=form)
        
        password = form.password.data
        if len(password) < 6 or re.search('\w*\d\w*', password) == None:
            flash('Password does not meet rules')
            return render_template('register.html', form=form)

        user = User(
            username=form.username.data,
            pwd_hash=generate_password_hash(password),
            chess_beginner=(not form.played_chess_before.data),
        )
        db.session.add(user)
        db.session.commit()

        # Mark intro to chess lesson as complete
        if not user.chess_beginner:
            mark_lesson_complete(LESSON_INTRO.id, user.id)

        session.clear()
        session["current_user"] = user.id
        redirect_url = request.args.get("next", None) or url_for("index")
        # TODO: Validate that the redirect url is on our domain (not some other site)
        return redirect(redirect_url)

    return render_template('register.html', form=form)

@app.route("/login", methods=['GET', 'POST'])
def login():
    form = LoginForm(request.form)
    redirect_url = request.args.get("next", None) or url_for("index")
    # TODO: Validate that the redirect url is on our domain (not some other site)
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        error = None

        if user is None:
            error = "Incorrect Username"
        elif not check_password_hash(user.pwd_hash, form.password.data):
            error = "Incorrect Password"

        if error is None:
            session.clear()
            session["current_user"] = user.id

            return redirect(redirect_url)

        flash(error)

    return render_template('login.html', form=form, next=redirect_url)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))
