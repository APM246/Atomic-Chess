from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField
from wtforms.validators import DataRequired

class SignUpForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    is_chess_beginner = BooleanField('Chess Beginner')
    remember_me = BooleanField('Remember me')
    submit = SubmitField('Register')

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Remember me')
    submit = SubmitField('Sign In')

class SettingsForm(FlaskForm):
    light_square_color = StringField('Light Square Color', validators=[DataRequired()])
    dark_square_color = StringField('Dark Square Color', validators=[DataRequired()])
    show_move_markers = BooleanField('Show Move Markers')
    show_square_highlights = BooleanField('Highlight Squares')
    use_move_animations = BooleanField('Animate Moves')
    submit = SubmitField('Save')
