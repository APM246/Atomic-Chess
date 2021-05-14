import enum
import click
from flask.cli import with_appcontext

from app.lessons import LESSON_ATOMIC
from app.models import Puzzle
from app import db

# Constants match constants defined in Chess.js

class Squares:
    A1 =  0
    B1 =  1
    C1 =  2
    D1 =  3
    E1 =  4
    F1 =  5
    G1 =  6
    H1 =  7
    A2 =  8
    B2 =  9
    C2 = 10
    D2 = 11
    E2 = 12
    F2 = 13
    G2 = 14
    H2 = 15
    A3 = 16
    B3 = 17
    C3 = 18
    D3 = 19
    E3 = 20
    F3 = 21
    G3 = 22
    H3 = 23
    A4 = 24
    B4 = 25
    C4 = 26
    D4 = 27
    E4 = 28
    F4 = 29
    G4 = 30
    H4 = 31
    A5 = 32
    B5 = 33
    C5 = 34
    D5 = 35
    E5 = 36
    F5 = 37
    G5 = 38
    H5 = 39
    A6 = 40
    B6 = 41
    C6 = 42
    D6 = 43
    E6 = 44
    F6 = 45
    G6 = 46
    H6 = 47
    A7 = 48
    B7 = 48
    C7 = 49
    D7 = 50
    E7 = 51
    F7 = 52
    G7 = 53
    H7 = 54
    A8 = 56
    B8 = 57
    C8 = 58
    D8 = 59
    E8 = 60
    F8 = 61
    G8 = 62
    H8 = 63

def create_move(from_square, to_square):
    return {
        "from": from_square,
        "to": to_square,
        "promotion": -1,
    }

def create_square_from_string(string):
    file = ord(string[0]) - ord("a")
    rank = ord(string[1]) - ord("1")
    return file + rank * 8

def create_move_from_string(string):
    from_square = create_square_from_string(string[:2])
    to_square = create_square_from_string(string[2:])
    return create_move(from_square, to_square)

def create_linear_move_tree(moves):
    result = []
    if len(moves) > 0:
        current = { "move": moves[0] }
        result.append(current)
        for i in range(1, len(moves)):
            current["continuation"] = [{ "move": moves[i] }]
            current = current["continuation"][0]
    return result

def create_atomic_puzzles():
    db.session.add(Puzzle(
        fen="6k1/5ppp/8/8/8/5Q2/5PPP/6K1 b - -",
        move_tree=create_linear_move_tree([
            create_move_from_string("g7g6"),
            create_move_from_string("f3f7"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_ATOMIC.id,
    ))

def clear_database():
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()

@click.command("init-db")
@with_appcontext
def init_db():
    """
    This is a command run from the command line using `flask init-db`
    that will add all the puzzles to the database."""
    clear_database()
    print("Cleared Database.")
    create_atomic_puzzles()

    db.session.commit()
    print("Success.")