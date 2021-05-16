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

// Class that represents a Puzzle, wraps a board with a starting position and tree of valid moves
class Puzzle {
    constructor(options) {
        this.correctMovePlayed = new EventEmitter();
        this.incorrectMovePlayed = new EventEmitter();
        this.puzzleComplete = new EventEmitter();
        this.puzzleReset = new EventEmitter();

        this._options = assignDefaults(options, DEFAULT_PUZZLE_OPTIONS);
        this._board = new ChessBoard(this._options.boardOptions);
        // Event color represents the color that the player is playing
        this._eventColor = this._options.eventColor;
        this._hintVisible = false;

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
        this.board.piecePickedUp.addEventListener(() => {
            if (this._hintVisible) {
                this.board.emphasizer.resetColors();
            }
        })

        this.reset();
    }

    get board() {
        return this._board;
    }

    get playerToMove() {
        return this._eventColor === null || this._eventColor === undefined || this.board.position.colorToMove === this._eventColor;
    }

    setFromData(data) {
        this._options.fen = data.fen;
        this._options.moveTree = data.moveTree;
        this._options.eventColor = data.eventColor;
        this._eventColor = this._options.eventColor;
        this._hintVisible = false;
        this.reset();
    }

    reset(sendEvent = true) {
        if (this._options.fen) {
            this.board.setFromFen(this._options.fen);
        } else {
            this.board.clear();
        }
        if (this._eventColor === null || this._eventColor === undefined) {
            // If no explicit player color use the opposite color of the colorToMove
            this._eventColor = otherColor(this.board.position.colorToMove);
        }
        this._currentMoveTree = null;
        if (this._options.moveTree) {
            this._currentMoveTree = this._options.moveTree;
        }
        if (sendEvent) {
            this.puzzleReset.trigger();
        }
    }

    // Check that puzzle has been completed (no correct moves left)
    isComplete() {
        return this._currentMoveTree === null;
    }

    // Get a list of current correct moves
    getCorrectMoves() {
        if (this._currentMoveTree) {
            return this._currentMoveTree.map(branch => branch.move);
        }
        return [];
    }

    // Check if a move is correct
    isCorrect(move) {
        for (const mv of this.getCorrectMoves()) {
            if (movesEqual(mv, move)) {
                return true;
            }
        }
        return false;
    }

    // Play the next correct move
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

    // Highlight the piece for the correct move
    showHint() {
        const moves = this.getCorrectMoves();
        if (moves.length > 0) {
            const move = moves[0];
            this.board.emphasizer.setColors("#00d0d0", "#00b9b9");
            this.board.emphasizer.onGrab(move.from);
            this._hintVisible = true;
        }
    }

    hideHint() {
        this.board.emphasizer.clear();
        this.board.emphasizer.resetColors();
        this._hintVisible = false;
    }

    // After playing a correct move advance to the next stage of the tree
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
