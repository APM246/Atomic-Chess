// Move tree format
// const tree = [{ move: createMove(), continuation: [{ move: createMove() }] }]

const DEFAULT_PUZZLE_OPTIONS = {
    eventColor: null,
    fen: null,
    moveTree: null,
    boardOptions: DEFAULT_CHESS_BOARD_OPTIONS,
};

function createLinearMoveTree(moves) {
    const result = [];
    if (moves.length > 0) {
        let current = { move: moves[0] };
        result.push(current);
        for (let i = 1; i < moves.length; i++) {
            current.continuation = [{ move: moves[i] }];
            current = current.continuation[0];
        }
    }
    return result;
}

function transformSettingsResponse(settings) {
    return {
        lightSquareColor: settings.light_square_color,
        darkSquareColor: settings.dark_square_color,
        showMoveMarkers: settings.show_move_markers,
        showSquareHighlights: settings.show_square_highlights,
        useMoveAnimations: settings.use_move_animations,
    };
}

class Puzzle {
    constructor(options) {
        this.correctMovePlayed = new EventEmitter();
        this.incorrectMovePlayed = new EventEmitter();
        this.puzzleComplete = new EventEmitter();
        this.puzzleReset = new EventEmitter();

        this._options = assignDefaults(options, DEFAULT_PUZZLE_OPTIONS);
        this._board = new ChessBoard(this._options.boardOptions);
        this._eventColor = this._options.eventColor === undefined ? null : this._options.eventColor;

        this.board.movePlayed.addEventListener((move) => {
            if (this.isCorrect(move)) {
                this._advanceMoveTree(move);
                if (!this.playerToMove) {
                    this.correctMovePlayed.trigger(move);
                }
            } else {
                this.incorrectMovePlayed.trigger(move);
            }
        });

        this.reset();
    }

    get board() {
        return this._board;
    }

    get playerToMove() {
        return this._eventColor === null || this.board.position.colorToMove === this._eventColor;
    }

    setFromData(data) {
        this._options.fen = data.fen;
        this._options.moveTree = data.moveTree;
        this._options.eventColor = data.eventColor;
        this._eventColor = this._options.eventColor;
        this.reset();
        if (this._eventColor === null || this._eventColor === undefined) {
            this._eventColor = otherColor(this.board.position.colorToMove);
        }
    }

    reset(sendEvent = true) {
        if (this._options.fen) {
            this.board.setFromFen(this._options.fen);
        } else {
            this.board.clear();
        }
        this._currentMoveTree = null;
        if (this._options.moveTree) {
            this._currentMoveTree = this._options.moveTree;
        }
        if (sendEvent) {
            this.puzzleReset.trigger();
        }
    }

    isComplete() {
        return this._currentMoveTree === null;
    }

    getCorrectMoves() {
        if (this._currentMoveTree) {
            return this._currentMoveTree.map(branch => branch.move);
        }
        return [];
    }

    isCorrect(move) {
        for (const mv of this.getCorrectMoves()) {
            if (movesEqual(mv, move)) {
                return true;
            }
        }
        return false;
    }

    playContinuation() {
        if (!this.isComplete()) {
            // Animate move
            this.board.applyMove(this.getCorrectMoves()[0], true);
        }
    }

    undoLastMove() {
        // Don't animate
        this.board.undoLastMove(false);
    }

    _advanceMoveTree(move) {
        if (this._currentMoveTree) {
            for (const branch of this._currentMoveTree) {
                if (movesEqual(branch.move, move)) {
                    if (branch.continuation) {
                        this._currentMoveTree = branch.continuation;
                    } else {
                        this._currentMoveTree = null;
                        this.puzzleComplete.trigger();
                    }
                }
            }
        }
    }
}
