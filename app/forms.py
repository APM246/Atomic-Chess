from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField, SubmitField
from wtforms.validators import DataRequired

username_field = StringField(default='Username', validators=[DataRequired()])
password_field = StringField(default='Password', validators=[DataRequired()])
remember_me_field = BooleanField('Remember me:')

class SignUpForm(FlaskForm):
    username = username_field
    password = password_field
    is_chess_beginner = BooleanField('Chess beginner:', default=True, render_kw={'checked':''})
    remember_me = remember_me_field
    submit = SubmitField('Register')

class LoginForm(FlaskForm):
    username = username_field
    password = password_field
    remember_me = remember_me_field
    submit = SubmitField('Sign In')
