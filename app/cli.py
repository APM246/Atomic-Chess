import click
import getpass
from flask.cli import with_appcontext

from werkzeug.security import check_password_hash, generate_password_hash
from app.lessons import LESSON_ATOMIC, LESSON_OPENING_TRAPS, LESSON_WIN_CONDITIONS
from app.models import Puzzle, User
from app.auth import create_user
from app import db

# Populate database with puzzles

def create_move(from_square, to_square):
    """ Utility function that creates a move object (does not support promotions) """
    return {
        "from": from_square,
        "to": to_square,
        "promotion": -1,
    }

def create_square_from_string(string):
    """ Utility function that converts a string like a3 to a square """
    file = ord(string[0]) - ord("a")
    rank = ord(string[1]) - ord("1")
    return file + rank * 8

def create_move_from_string(string):
    """ Utility function that creates a move from a string like e2e4 """
    from_square = create_square_from_string(string[:2])
    to_square = create_square_from_string(string[2:])
    return create_move(from_square, to_square)

def create_linear_move_tree(moves):
    """ Utility function that generates a move tree from a list of moves """
    result = []
    if len(moves) > 0:
        current = { "move": moves[0] }
        result.append(current)
        for i in range(1, len(moves)):
            move = moves[i]
            if isinstance(move, list):
                assert(i == len(moves) - 1)
                current["continuation"] = list(map(lambda mv: { "move": mv }, move))
            else:
                current["continuation"] = [{ "move": moves[i] }]
            current = current["continuation"][0]
    return result

def create_atomic_puzzles():
    """ Create the puzzles for the Atomic Lesson """

    db.session.add(Puzzle(
        fen="rnb1kbnr/pppppppp/2q5/8/4P3/8/PPPP1PPP/RNBQKBNR b - -",
        move_tree=create_linear_move_tree([
            create_move_from_string("d7d5"),
            create_move_from_string("e4d5"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_ATOMIC.id,
    ))
    db.session.add(Puzzle(
        fen="1kr2bnr/ppp1pppp/3q4/5N2/4P3/3P4/PPP2PPP/RNBQKB1R b - -",
        move_tree=create_linear_move_tree([
            create_move_from_string("d6g6"),
            create_move_from_string("f5g7"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_ATOMIC.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("d1f3"),
            create_move_from_string("d5e4"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_ATOMIC.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqk1r1/1p2p2p/p1pp1pp1/2N5/3PP3/8/PPP2PPP/R2QK2R b KQq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("d8a5"),
            create_move_from_string("c5a6"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_ATOMIC.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkbnr/ppp1p2p/6p1/3p4/3P1B2/8/PPP2PPP/RN2KB1R b KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("e7e6"),
            create_move_from_string("f4c7"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_ATOMIC.id,
    ))

def create_win_condition_puzzles():
    """ Create puzzles for the Win Condition Lesson """

    db.session.add(Puzzle(
        fen="rnbqkb1r/ppppp1pp/5p2/7Q/3N1P2/4P3/PPPP1nPP/RNB1KB1R b KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("g7g6"),
            create_move_from_string("h5d5"),
            create_move_from_string("d7d6"),
            create_move_from_string("d5f7"),
            create_move_from_string("e8d7"),
            create_move_from_string("f7e7"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_WIN_CONDITIONS.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkbnr/pppp3p/6p1/4p3/8/7Q/PPPP1PPP/RNB1KBNR b KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("e8f7"),
            create_move_from_string("h3e6"),
            create_move_from_string("f7g7"),
            [create_move_from_string("e6g6"), create_move_from_string("e6g8")],
        ]),
        is_atomic=True,
        lesson_id=LESSON_WIN_CONDITIONS.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkbnr/ppppp1pp/8/8/8/4P3/PPPP1PPP/RNBQKB1R b KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("b8c6"),
            create_move_from_string("d1h5"),
            create_move_from_string("g7g6"),
            create_move_from_string("h5d5"),
            create_move_from_string("d7d6"),
            create_move_from_string("d5f7"),
            create_move_from_string("e8d7"),
            create_move_from_string("f7e7"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_WIN_CONDITIONS.id,
    ))
    db.session.add(Puzzle(
        fen="2kr1b1r/ppnp3p/6p1/4p1B1/3P4/5P2/PPP3PP/R3K2R b KQ -",
        move_tree=create_linear_move_tree([
            create_move_from_string("f8b4"),
            create_move_from_string("g5d8"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_WIN_CONDITIONS.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkbnr/pppp2pp/4p3/5pN1/8/8/PPPPPPPP/RNBQKB1R w KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("g5f7"),
            create_move_from_string("d8h4"),
            create_move_from_string("g2g3"),
            create_move_from_string("h4d4"),
            create_move_from_string("e2e3"),
            create_move_from_string("d4d2"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_WIN_CONDITIONS.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkbnr/p7/2pp1pp1/1p5p/1P2Q3/3BP3/PBPP1PPP/RN2K2R b KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("c8e6"),
            create_move_from_string("b2f6"),
            create_move_from_string("f8e7"),
            create_move_from_string("e4e7"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_WIN_CONDITIONS.id,
    ))
    db.session.add(Puzzle(
        fen="r4rk1/p3p2p/4b1p1/1p6/P2p4/1P2P2P/2PP2P1/R1B1KB1R w KQ -",
        move_tree=create_linear_move_tree([
            create_move_from_string("e1d1"),
            create_move_from_string("f8f2"),
            create_move_from_string("d2d3"),
            create_move_from_string("f2c2"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_WIN_CONDITIONS.id,
    ))
    db.session.add(Puzzle(
        fen="r1bqkbnr/1p1p3p/4ppp1/1B6/8/4P2N/PPPP1PPP/R1B1K2R b KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("e8f7"),
            create_move_from_string("h3f4"),
            create_move_from_string("e6e5"),
            create_move_from_string("f4g6"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_WIN_CONDITIONS.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqk3/pppp3p/4pppQ/8/5P2/4P3/PP1P2PP/RNB1KB1R b KQq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("d7d6"),
            create_move_from_string("h6f8"),
            create_move_from_string("e8d7"),
            [create_move_from_string("f8d8"), create_move_from_string("f8d6")],
        ]),
        is_atomic=True,
        lesson_id=LESSON_WIN_CONDITIONS.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkbnr/pp2pp1p/8/3p4/4P3/BP6/P1PP1PPP/RN2K1NR b KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("d8d6"),
            create_move_from_string("e4d5"),
            create_move_from_string("e8d8"),
            create_move_from_string("a3e7"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_WIN_CONDITIONS.id,
    ))

def create_opening_traps_puzzles():
    """ Create the puzzles for the Opening Traps Lesson """

    db.session.add(Puzzle(
        fen="rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("f7f5"),
            create_move_from_string("f3e5"),
            create_move_from_string("d7d6"),
            create_move_from_string("e5d7"),
            create_move_from_string("e8f7"),
            create_move_from_string("d7f8"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_OPENING_TRAPS.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkb1r/ppppp1pp/5p1n/4N3/3P4/8/PPP1PPPP/RNBQKB1R b KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("f6e5"),
            create_move_from_string("c1g5"),
            create_move_from_string("e7e6"),
            create_move_from_string("g5d8"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_OPENING_TRAPS.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkb1r/pppp1ppp/4p2n/3N4/8/8/PPPPPPPP/RNBQKB1R w KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("d5c7"),
            create_move_from_string("h6g4"),
            create_move_from_string("f2f3"),
            create_move_from_string("g4f2"),
            create_move_from_string("e2e4"),
            create_move_from_string("f2d1"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_OPENING_TRAPS.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("d7d6"),
            create_move_from_string("f3g5"),
            create_move_from_string("f7f6"),
            create_move_from_string("g5f7"),
            create_move_from_string("d8d7"),
            create_move_from_string("f7d6"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_OPENING_TRAPS.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkbnr/pppp1p1p/4p1p1/7Q/8/4PN2/PPPP1PPP/RNB1KB1R b KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("g6h5"),
            create_move_from_string("f3e5"),
            create_move_from_string("f7f6"),
            create_move_from_string("e5d7"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_OPENING_TRAPS.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkb1r/pp1pp1pp/2p4n/8/7Q/2P5/PP1PPPPP/RNB1KB1R b KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("g7g5"),
            create_move_from_string("h4h5"),
            create_move_from_string("h6f7"),
            create_move_from_string("h5f7"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_OPENING_TRAPS.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkbnr/pp1ppppp/2p5/8/4N3/8/PPPPPPPP/R1BQKBNR b KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("f7f6"),
            create_move_from_string("e4c5"),
            create_move_from_string("d7d5"),
            create_move_from_string("c5d7"),
            create_move_from_string("d8a5"),
            create_move_from_string("d7f8"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_OPENING_TRAPS.id,
    ))
    db.session.add(Puzzle(
        fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -",
        move_tree=create_linear_move_tree([
            create_move_from_string("g1f3"),
            create_move_from_string("f7f6"),
        ]),
        is_atomic=True,
        lesson_id=LESSON_OPENING_TRAPS.id,
    ))

def clear_database():
    """ Utility function that clears the data from all tables """
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()

def create_admin_user():
    """ Prompts user to create an admin user """
    print("Create admin user")
    username = input("Username: ")
    password = getpass.getpass("Password: ")
    confirm_password = getpass.getpass("Confirm password: ")
    if password != confirm_password:
        print("Passwords did not match")
        return create_admin_user()
    create_user(username, password, False, admin=True)
    print("Created admin user: {}".format(username))

@click.command("init-db")
@with_appcontext
def init_db():
    """
    This is a command run from the command line using `flask init-db`
    that will add all the puzzles to the database."""
    clear_database()
    print("Cleared Database.")

    create_atomic_puzzles()
    create_win_condition_puzzles()
    create_opening_traps_puzzles()

    create_admin_user()

    db.session.commit()
    print("Success.")
