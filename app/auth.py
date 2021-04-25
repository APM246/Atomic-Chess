from flask import render_template, abort, flash, redirect, request, url_for, session, g
from app import app, db
from app.models import User
from app.forms import SignUpForm, LoginForm
from werkzeug.security import check_password_hash, generate_password_hash
import functools

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
            return redirect(url_for("login"))

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

        user = User(
            username=form.username.data,
            pwd_hash=generate_password_hash(form.password.data),
            chess_beginner=form.is_chess_beginner.data
        )

        db.session.add(user)
        db.session.commit()

        session.clear()
        session["current_user"] = user.id
        return redirect(url_for('learn'))

    return render_template('register.html', form=form)

@app.route("/login", methods=['GET', 'POST'])
def login():
    form = LoginForm(request.form)
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
            return redirect(url_for('learn'))
        
        flash(error)

    return render_template('login.html', form=form)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))