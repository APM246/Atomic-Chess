from flask_wtf import FlaskForm
from wtforms import StringField, BooleanField, SubmitField
from wtforms.fields.simple import PasswordField
from wtforms.validators import DataRequired, Length

username_field = StringField(validators=[DataRequired()])
password_field = PasswordField(validators=[DataRequired(), Length(min=6, max=32)])

class SignUpForm(FlaskForm):
    username = username_field
    password = password_field
    played_chess_before = BooleanField('Chess experience:', default=True, render_kw={'checked':''})
    submit = SubmitField('Register')

class LoginForm(FlaskForm):
    username = username_field
    password = password_field
    submit = SubmitField('Sign In')
