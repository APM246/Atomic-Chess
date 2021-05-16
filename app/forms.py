from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField, SubmitField
from wtforms.fields.simple import PasswordField
from wtforms.validators import DataRequired, Length

username_field = StringField(validators=[DataRequired()])
password_field = PasswordField(validators=[DataRequired()])

class SignUpForm(FlaskForm):
    username = username_field
    password = password_field
    played_chess_before = BooleanField('Chess Experience:', default=False)
    submit = SubmitField('Register')

class LoginForm(FlaskForm):
    username = username_field
    password = password_field
    submit = SubmitField('Sign In')
