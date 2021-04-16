// Move tree format
// const tree = [{ move: createMove(), continuation: [{ move: createMove() }] }]

const DEFAULT_PUZZLE_OPTIONS = {
    fen: null,
    moveTree: null,
    boardOptions: DEFAULT_CHESS_BOARD_OPTIONS,
};

function createLinearMoveTree(moves) {
    const result = [];
    if (moves.length > 0) {
        let current = { move: moves[0] };
        result.push(current);
        for (let i = 0; i < moves.length; i++) {
            current.continuation = [{ move: moves[i] }];
            current = current.continuation;
        }
    }
    return result
}

class Puzzle {

    constructor(options) {
        this.correctMovePlayed = new EventEmitter();
        this.incorrectMovePlayed = new EventEmitter();
        this.puzzleComplete = new EventEmitter();

        this._options = assignDefaults(options, DEFAULT_PUZZLE_OPTIONS);
        this._board = new ChessBoard(this._options.boardOptions);

        this.board.movePlayed.addEventListener((move) => {
            if (this.isCorrect(move)) {
                this._advanceMoveTree(move);
                this.correctMovePlayed.trigger(move);
            } else {
                this.incorrectMovePlayed.trigger(move);
            }
        });

        this.reset();
    }

    get board() {
        return this._board;
    }

    reset() {
        if (this._options.fen) {
            this.board.setFromFen(this._options.fen);
        } else {
            this.board.clear();
        }
        this._currentMoveTree = null;
        if (this._options.moveTree) {
            this._currentMoveTree = this._options.moveTree;
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

};
