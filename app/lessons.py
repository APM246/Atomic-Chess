""" Module that creates all the lessons instead of storing the static data in the database """

class Lesson:
    def __init__(self, lesson_id, name, description, template, max_progression):
        self.id = lesson_id
        self.name = name
        self.description = description
        # Path to the template filename
        self.template = template
        # Represents the maximum progression value
        # Used to calculate the percentage completion of a lesson
        self.max_progression = max_progression

LESSON_INTRO = Lesson(
    lesson_id=0,
    name="Chess",
    description="Never played chess before? This lesson will go through the basics of chess",
    template="lessons/lesson0.html",
    max_progression=13,
)

LESSON_ATOMIC = Lesson(
    lesson_id=1,
    name="Atomic",
    description="Learn the rules of Atomic Chess and how they differ from traditional chess",
    template="lessons/lesson1.html",
    max_progression=1,
)

LESSON_WIN_CONDITIONS = Lesson(
    lesson_id=2,
    name="Win Conditions",
    description="In Atomic Chess you can win by checkmate, but can also win by blowing up the enemy king. This lesson will teach you how this effects the game",
    template="lessons/lesson2.html",
    max_progression=4,
)

LESSON_OPENING_TRAPS = Lesson(
    lesson_id=3,
    name="Opening Traps",
    description="White has many traps they can set in the opening, learn these traps to crush your oppenent!",
    template="lessons/lesson3.html",
    max_progression=3,
)

LESSON_PIECE_SAFETY = Lesson(
    lesson_id=4,
    name="Piece Safety",
    description="The rules of atomic changes the way you think about attacking and defending pieces",
    template="lessons/lesson4.html",
    max_progression=3,
)

LESSON_KINGS_TOUCHING = Lesson(
    lesson_id=5,
    name="Kings Touching",
    description="Kings can touch each other in Atomic Chess! This lesson teaches you the consequences of this strange rule",
    template="lessons/lesson5.html",
    max_progression=3,
)

LESSONS_BY_ID = {}

def get_all_lessons():
    """ Returns a list of all lessons """
    return [LESSON_INTRO, LESSON_ATOMIC, LESSON_WIN_CONDITIONS, LESSON_OPENING_TRAPS, LESSON_PIECE_SAFETY, LESSON_KINGS_TOUCHING]

def get_lesson_by_name(name):
    """ Get the lesson with a given name """
    for lesson in get_all_lessons():
        if lesson.name == name:
            return lesson
    return None

def init():
    """ Sets up LESSONS_BY_ID """
    for lesson in get_all_lessons():
        LESSONS_BY_ID[lesson.id] = lesson
