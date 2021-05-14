class Lesson:
    def __init__(self, lesson_id, name, description, template, max_progression):
        self.id = lesson_id
        self.name = name
        self.description = description
        self.template = template
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
    max_progression=1,
)

LESSON_OPENING_TRAPS = Lesson(
    lesson_id=3,
    name="Opening Traps",
    description="White has many traps they can set in the opening, learn these traps to crush your oppenent!",
    template="lessons/lesson3.html",
    max_progression=3,
)

LESSON_CHECKS = Lesson(
    lesson_id=4,
    name="Checks",
    description="Unlike traditional chess, if you are put in check, you dont have to move out of it if you can blow up the king. This lesson will show you some examples",
    template="lessons/lesson1.html",
    max_progression=1,
)

LESSON_PIECE_SAFETY = Lesson(
    lesson_id=5,
    name="Piece Safety",
    description="TODO",
    template="lessons/lesson1.html",
    max_progression=1,
)

LESSON_KINGS_TOUCHING = Lesson(
    lesson_id=6,
    name="Kings Touching",
    description="Kings can touch each other in Atomic Chess! This lesson teaches you the consequences of this strange rule",
    template="lessons/lesson1.html",
    max_progression=1,
)

LESSONS_BY_ID = {}

def get_all_lessons():
    return [LESSON_INTRO, LESSON_ATOMIC, LESSON_WIN_CONDITIONS, LESSON_OPENING_TRAPS, LESSON_CHECKS, LESSON_PIECE_SAFETY, LESSON_KINGS_TOUCHING]

def get_lesson_by_name(name):
    for lesson in get_all_lessons():
        if lesson.name == name:
            return lesson
    return None

def init():
    for lesson in get_all_lessons():
        LESSONS_BY_ID[lesson.id] = lesson
