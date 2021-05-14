const DEFAULT_CHESS_BOARD_OPTIONS = {
    target: "body",
    lightSquareColor: "#EEEEEE",
    darkSquareColor: "#4682B4",
    lightSquareHighlightColor: "#F6F669",
    darkSquareHighlightColor: "#BACA2B",
    pieceImages: {
        basePath: "/static/pieces/",
        whitePawn: "white_pawn.png",
        whiteKnight: "white_knight.png",
        whiteBishop: "white_bishop.png",
        whiteRook: "white_rook.png",
        whiteQueen: "white_queen.png",
        whiteKing: "white_king.png",
        blackPawn: "black_pawn.png",
        blackKnight: "black_knight.png",
        blackBishop: "black_bishop.png",
        blackRook: "black_rook.png",
        blackQueen: "black_queen.png",
        blackKing: "black_king.png",
    },
    interactive: true,
    showMoveMarkers: true,
    showSquareHighlights: true,
    allowUndo: true,
    useMoveAnimations: true,
    animationTime: 300,
};

const MOVE_MARKER_DEFAULT_COLOR = "#22222266";
const MOVE_MARKER_CAPTURE_COLOR = "#AA222266";
const MOVE_MARKER_DEFAULT_SCALE = 0.3;
const MOVE_MARKER_CAPTURE_SCALE = 0.4;

const MOVING_PIECE_Z_INDEX_STRING = "20";
const DEFAULT_PIECE_Z_INDEX_STRING = "";

// Format: [[files, ranks], ...]
const ATOMIC_EXPLOSION_VECTORS = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]];

// Constants that represent the current state of the board
/* eslint-disable-next-line object-curly-newline */
const POSITION_STATE = Object.freeze({ VALID: 0, DRAW: 1, WHITE_WIN: 2, BLACK_WIN: 3 });

class EventEmitter {
    constructor() {
        this._listeners = [];
    }

    addEventListener(listener) {
        this._listeners.push(listener);
        return () => {
            const index = this._listeners.indexOf(listener);
            if (index >= 0) {
                this._listeners.splice(index, 1);
            }
        };
    }

    trigger(...args) {
        for (const listener of this._listeners) {
            listener(...args);
        }
    }
}

// Class that represents the state of the chess game (piece positions, castling rights, etc.)
// Does not handle any graphics/user interaction
class Position {
    constructor() {
        this.ready = new EventEmitter();
        this.cleared = new EventEmitter();
        this.movePlayed = new EventEmitter();
        this.moveUndone = new EventEmitter();

        this._isAtomic = false;
        this._sandbox = false;
        this.reset();
    }

    get isAtomic() {
        return this._isAtomic;
    }

    set isAtomic(enabled) {
        this._isAtomic = enabled;
    }

    get sandbox() {
        return this._sandbox;
    }

    set sandbox(enabled) {
        this._sandbox = enabled;
    }

    get colorToMove() {
        return this._colorToMove;
    }

    set colorToMove(color) {
        this._colorToMove = color;
    }

    get enpassantSquare() {
        return this._enpassantSquare;
    }

    get inCheck() {
        return this._inCheck;
    }

    isSquareOccupied(square) {
        return this.getPieceOnSquare(square) !== null;
    }

    getPieceOnSquare(square) {
        assert(square >= 0 && square < this._squares.length, "Invalid square");
        return this._squares[square];
    }

    canCastleKingside(color) {
        return color === COLORS.WHITE ? this._castlingRights.whiteKingside : this._castlingRights.blackKingside;
    }

    canCastleQueenside(color) {
        return color === COLORS.WHITE ? this._castlingRights.whiteQueenside : this._castlingRights.blackQueenside;
    }

    getKingSquare(color) {
        return this._kingSquares[color];
    }

    isKingsideCastle(move) {
        const piece = this.getPieceOnSquare(move.from);
        return Boolean(piece) && piece.piece === PIECES.KING && fileOfSquare(move.from) === FILES.FILE_E && fileOfSquare(move.to) === FILES.FILE_G;
    }

    isQueensideCastle(move) {
        const piece = this.getPieceOnSquare(move.from);
        return Boolean(piece) && piece.piece === PIECES.KING && fileOfSquare(move.from) === FILES.FILE_E && fileOfSquare(move.to) === FILES.FILE_C;
    }

    isCapture(move) {
        const pieceOnSquare = this.getPieceOnSquare(move.to);
        if (pieceOnSquare) {
            return true;
        }
        const movingPiece = this.getPieceOnSquare(move.from);
        return movingPiece && movingPiece.piece === PIECES.PAWN && move.to === this.enpassantSquare;
    }

    // Takes a pseudo-legal move and determines whether it is a legal move
    isLegal(move) {
        const ctm = this.colorToMove;

        if (this._kingSquares[ctm] === SQUARES.INVALID && !this.sandbox) {
            return false;
        }

        const kingsideCastle = this.isKingsideCastle(move);
        const queensideCastle = this.isQueensideCastle(move);
        if (kingsideCastle || queensideCastle) {
            // Can't castle when in check
            if (this.inCheck) {
                return false;
            }
            // Ensure that we are not castling through check
            const rank = rankOfSquare(move.from);
            const squares = [];
            const pawnSquares = [];
            const squareShift = this.colorToMove === COLORS.WHITE ? FILE_COUNT : -FILE_COUNT;
            // Find squares that if attacked by an enemy piece would prevent us castling
            // Also find squares that if an enemy pawn was on would prevent us castling (the squares needs to be shifted by squareShift later)
            if (kingsideCastle) {
                squares.push(createSquare(FILES.FILE_F, rank), createSquare(FILES.FILE_G, rank));
                pawnSquares.push(createSquare(FILES.FILE_E, rank), createSquare(FILES.FILE_F, rank), createSquare(FILES.FILE_G, rank), createSquare(FILES.FILE_H, rank));
            } else {
                squares.push(createSquare(FILES.FILE_D, rank), createSquare(FILES.FILE_C, rank));
                pawnSquares.push(createSquare(FILES.FILE_E, rank), createSquare(FILES.FILE_D, rank), createSquare(FILES.FILE_C, rank), createSquare(FILES.FILE_B, rank));
            }
            // Pretend that it's the other colors turn to move
            this._colorToMove = otherColor(ctm);
            // Find all of their moves
            const attackingMoves = generatePseudoLegalMoves(this);
            // Ensure none of the moves attack the squares which would prevent us castling
            for (const mv of attackingMoves) {
                if (squares.indexOf(mv.to) >= 0) {
                    this._colorToMove = ctm;
                    return false;
                }
            }
            // Revert color to move
            this._colorToMove = ctm;
            // Ensure there are no pawns which attack the path of the king
            for (const square of pawnSquares) {
                // pawnSquares are on the same rank as our king
                // shift them up 1 rank using squareShift
                const pawnSquare = square + squareShift;
                const pieceOnSquare = this.getPieceOnSquare(pawnSquare);
                // If there is an enemy pawn on any of these squares the move is illegal
                if (pieceOnSquare && pieceOnSquare.piece === PIECES.PAWN && pieceOnSquare.color === otherColor(ctm)) {
                    return false;
                }
            }
        }

        // Some atomic specific rules
        if (this.isAtomic) {
            const movingPiece = this.getPieceOnSquare(move.from);
            const isCapture = this.isCapture(move);
            const ourKingSquare = this.getKingSquare(ctm);
            const otherKingSquare = this.getKingSquare(otherColor(ctm));
            // King can never capture anything
            if (movingPiece && movingPiece.piece === PIECES.KING && isCapture) {
                return false;
            }
            // In sandbox mode, there may not be kings at all
            if (ourKingSquare === SQUARES.INVALID || otherKingSquare === SQUARES.INVALID) {
                return this.sandbox;
            }
            // Cannot capture anything next to our own king
            if (isCapture && isNextToSquare(move.to, ourKingSquare)) {
                return false;
            }
            // Any capture that explodes enemy king is legal (even if in check)
            // as long as it does not capture next to our king (handled by above case)
            if (isCapture && isNextToSquare(move.to, otherKingSquare)) {
                return true;
            }
            // Our king can always move next to the opposition king
            if (movingPiece.piece === PIECES.KING && isNextToSquare(move.to, otherKingSquare)) {
                return true;
            }
            // If our king is already next to the opposition king any non-king move is legal
            if (movingPiece && movingPiece.piece !== PIECES.KING && isNextToSquare(ourKingSquare, otherKingSquare)) {
                return true;
            }
        }

        // We need to check that the move we played didn't cause us to be in check
        // Apply the move then check the enemy's moves - if any attack our king then the move is illegal

        const undoInfo = this.applyMove(move, false, false);
        // Need to use the king square from after applying the move (can't move into check)
        const kingSquare = this.getKingSquare(ctm);
        const moves = generatePseudoLegalMoves(this);
        let isLegal = true;
        for (const mv of moves) {
            if (mv.to === kingSquare) {
                isLegal = false;
                break;
            }
        }
        // UNDO MOVE
        this.undoMove(move, undoInfo, false, false);
        return isLegal;
    }

    // Set the piece positions from a Forsyth–Edwards Notation (FEN) string
    setFromFen(fen) {
        this.reset();
        let currentFile = FILES.FILE_A;
        let currentRank = RANKS.RANK_8;
        let index = 0;
        for (const c of fen) {
            index++;
            if (c === " ") {
                break;
            }
            const count = Number(c);
            if (!Number.isNaN(count)) {
                currentFile += count;
            }
            if (c === "/") {
                currentRank--;
                currentFile = FILES.FILE_A;
            }
            switch (c) {
            case "P":
                this._squares[createSquare(currentFile++, currentRank)] = { piece: PIECES.PAWN, color: COLORS.WHITE };
                break;
            case "N":
                this._squares[createSquare(currentFile++, currentRank)] = { piece: PIECES.KNIGHT, color: COLORS.WHITE };
                break;
            case "B":
                this._squares[createSquare(currentFile++, currentRank)] = { piece: PIECES.BISHOP, color: COLORS.WHITE };
                break;
            case "R":
                this._squares[createSquare(currentFile++, currentRank)] = { piece: PIECES.ROOK, color: COLORS.WHITE };
                break;
            case "Q":
                this._squares[createSquare(currentFile++, currentRank)] = { piece: PIECES.QUEEN, color: COLORS.WHITE };
                break;
            case "K":
                this._squares[createSquare(currentFile++, currentRank)] = { piece: PIECES.KING, color: COLORS.WHITE };
                break;
            case "p":
                this._squares[createSquare(currentFile++, currentRank)] = { piece: PIECES.PAWN, color: COLORS.BLACK };
                break;
            case "n":
                this._squares[createSquare(currentFile++, currentRank)] = { piece: PIECES.KNIGHT, color: COLORS.BLACK };
                break;
            case "b":
                this._squares[createSquare(currentFile++, currentRank)] = { piece: PIECES.BISHOP, color: COLORS.BLACK };
                break;
            case "r":
                this._squares[createSquare(currentFile++, currentRank)] = { piece: PIECES.ROOK, color: COLORS.BLACK };
                break;
            case "q":
                this._squares[createSquare(currentFile++, currentRank)] = { piece: PIECES.QUEEN, color: COLORS.BLACK };
                break;
            case "k":
                this._squares[createSquare(currentFile++, currentRank)] = { piece: PIECES.KING, color: COLORS.BLACK };
                break;
            }
        }

        this._colorToMove = (fen[index] === "w") ? COLORS.WHITE : COLORS.BLACK;
        index += 2;

        this._castlingRights.whiteKingside = false;
        this._castlingRights.whiteQueenside = false;
        this._castlingRights.blackKingside = false;
        this._castlingRights.blackQueenside = false;

        while (index < fen.length && fen[index] !== " ") {
            switch (fen[index]) {
            case "K":
                this._castlingRights.whiteKingside = true;
                break;
            case "Q":
                this._castlingRights.whiteQueenside = true;
                break;
            case "k":
                this._castlingRights.blackKingside = true;
                break;
            case "q":
                this._castlingRights.blackQueenside = true;
                break;
            }
            index++;
        }
        index++;

        if (fen[index] !== "-") {
            this._enpassantSquare = squareFromString(fen.substr(index, 2));
            index += 3;
        } else {
            index += 2;
        }

        this._initialize();

        // Send creation events
        this.ready.trigger();
    }

    // Clears pieces and resets castling rights
    reset() {
        this._squares = [];
        for (let i = 0; i < SQUARE_COUNT; i++) {
            this._squares.push(null);
        }
        this._castlingRights = {
            whiteKingside: true,
            whiteQueenside: true,
            blackKingside: true,
            blackQueenside: true,
        };
        this._enpassantSquare = SQUARES.INVALID;
        this._colorToMove = COLORS.WHITE;
        this._kingSquares = [SQUARES.INVALID, SQUARES.INVALID];
        this._inCheck = false;
        this.cleared.trigger();
    }

    // Applies a move to the position - does not check that the move is legal or even pseudo-legal
    // also does not check if the game has already ended (someone got mated)
    applyMove(move, animate = false, sendEvents = true) {
        assert(Boolean(move), "Invalid move");
        // Save the current board state
        const undoInfo = {
            inCheck: this.inCheck,
            squares: [...this._squares],
            castlingRights: { ...this._castlingRights },
            enpassantSquare: this._enpassantSquare,
            kingSquares: [...this._kingSquares],
            capturedPieces: [],
            isPromotion: false,
            isKingsideCastle: false,
            isQueensideCastle: false,
            movingPiece: null,
        };
        if (movesEqual(move, MOVE_NONE)) {
            this._colorToMove = otherColor(this._colorToMove);
            if (sendEvents) {
                this.movePlayed.trigger(null);
            }
            return undoInfo;
        }
        const eventData = {
            move,
            animate,
            movingPieces: [],
            capturedPieces: [],
            promotedPieces: [],
            movingPieceCaptured: false,
        };
        const fromSquare = move.from;
        const toSquare = move.to;
        const promotion = move.promotion;
        const enpassantSquare = this.enpassantSquare;
        const movingPiece = this.getPieceOnSquare(fromSquare);
        undoInfo.movingPiece = movingPiece;
        assert(Boolean(movingPiece) && movingPiece.piece !== PIECES.NONE && movingPiece.color === this.colorToMove, "Invalid move");
        const capturedPiece = this.getPieceOnSquare(toSquare);
        assert(!capturedPiece || capturedPiece.color !== this.colorToMove, "Invalid capture");

        // If we have captured someone's rook and it was on its original square - prevent castling
        const updateCastlingFromCapturedPiece = (capPiece, square) => {
            if (capPiece && capPiece.piece === PIECES.ROOK) {
                const requiredRank = capPiece.color === COLORS.WHITE ? RANKS.RANK_1 : RANKS.RANK_8;
                const fromFile = fileOfSquare(square);
                const fromRank = rankOfSquare(square);
                if (fromFile === FILES.FILE_H && requiredRank === fromRank) {
                    if (capPiece.color === COLORS.WHITE) {
                        this._castlingRights.whiteKingside = false;
                    } else {
                        this._castlingRights.blackKingside = false;
                    }
                } else if (fromFile === FILES.FILE_A && requiredRank === fromRank) {
                    if (capPiece.color === COLORS.WHITE) {
                        this._castlingRights.whiteQueenside = false;
                    } else {
                        this._castlingRights.blackQueenside = false;
                    }
                }
            }
        };

        // Utility function called whenever a piece is captured
        // Handles atomic chess explosion
        const explode = (capturingPiece, captureFrom, explosionSquare) => {
            if (this.isAtomic) {
                const file = fileOfSquare(explosionSquare);
                const rank = rankOfSquare(explosionSquare);
                for (const vector of ATOMIC_EXPLOSION_VECTORS) {
                    const newFile = file + vector[0];
                    const newRank = rank + vector[1];
                    if (validFileAndRank(newFile, newRank)) {
                        const newSquare = createSquare(newFile, newRank);
                        const pieceOnSquare = this.getPieceOnSquare(newSquare);
                        // Only explode non-pawn pieces
                        if (pieceOnSquare && pieceOnSquare.piece !== PIECES.PAWN) {
                            updateCastlingFromCapturedPiece(pieceOnSquare, newSquare);
                            // Check if the enemy king got blown up
                            if (pieceOnSquare.piece === PIECES.KING) {
                                this._kingSquares[otherColor(this.colorToMove)] = SQUARES.INVALID;
                            }
                            undoInfo.capturedPieces.push({ square: newSquare, piece: pieceOnSquare });
                            eventData.capturedPieces.push({ square: newSquare, piece: pieceOnSquare });
                            this._squares[newSquare] = null;
                        }
                    }
                }
                // Explode the moving piece
                this._squares[explosionSquare] = null;
                undoInfo.capturedPieces.push({ square: captureFrom, piece: capturingPiece, isMovingPiece: true });
                eventData.movingPieceCaptured = true;
            }
        };

        // Reset enpassant square
        this._enpassantSquare = SQUARES.INVALID;

        // Clear the from square
        this._squares[fromSquare] = null;
        // Move to the new square (copy piece data)
        this._squares[toSquare] = { ...movingPiece };

        if (capturedPiece) {
            undoInfo.capturedPieces.push({ square: toSquare, piece: capturedPiece });
            eventData.capturedPieces.push({ square: toSquare, piece: capturedPiece });
            explode(movingPiece, fromSquare, toSquare);
        }

        // Enpassant
        if (toSquare === enpassantSquare && movingPiece.piece === PIECES.PAWN) {
            const captureSquare = getBackwardSquare(toSquare, this.colorToMove);
            const capturedPawn = { piece: PIECES.PAWN, color: otherColor(this.colorToMove) };
            undoInfo.capturedPieces.push({ square: captureSquare, piece: capturedPawn });
            eventData.capturedPieces.push({ square: captureSquare, piece: capturedPawn });
            this._squares[captureSquare] = null;
            explode(movingPiece, fromSquare, toSquare);
        }

        // Update promotion
        if (promotion !== PIECES.NONE && movingPiece.piece === PIECES.PAWN && (!this.isAtomic || !capturedPiece)) {
            this._squares[toSquare] = { piece: promotion, color: this.colorToMove };
            undoInfo.isPromotion = true;
            eventData.promotedPieces.push({ square: toSquare, piece: this._squares[toSquare] });
        }

        // If we double push a pawn - set the enpassant square
        if (movingPiece.piece === PIECES.PAWN && Math.abs(rankOfSquare(fromSquare) - rankOfSquare(toSquare)) === 2) {
            this._enpassantSquare = getBackwardSquare(toSquare, this.colorToMove);
        }

        // If the king has moved then revoke castling rights
        if (movingPiece.piece === PIECES.KING) {
            if (this.colorToMove === COLORS.WHITE) {
                this._castlingRights.whiteKingside = false;
                this._castlingRights.whiteQueenside = false;
            } else {
                this._castlingRights.blackKingside = false;
                this._castlingRights.blackQueenside = false;
            }
            this._kingSquares[this.colorToMove] = toSquare;
        }

        // If we are moving a rook from its initial square revoke castling rights
        if (movingPiece.piece === PIECES.ROOK) {
            const requiredRank = this.colorToMove === COLORS.WHITE ? RANKS.RANK_1 : RANKS.RANK_8;
            const fromFile = fileOfSquare(fromSquare);
            const fromRank = rankOfSquare(fromSquare);
            if (fromFile === FILES.FILE_H && requiredRank === fromRank) {
                if (this.colorToMove === COLORS.WHITE) {
                    this._castlingRights.whiteKingside = false;
                } else {
                    this._castlingRights.blackKingside = false;
                }
            } else if (fromFile === FILES.FILE_A && requiredRank === fromRank) {
                if (this.colorToMove === COLORS.WHITE) {
                    this._castlingRights.whiteQueenside = false;
                } else {
                    this._castlingRights.blackQueenside = false;
                }
            }
        }

        // If we capture the opponent's rook on its initial square revoke their castling rights
        updateCastlingFromCapturedPiece(capturedPiece, toSquare);

        // Castling
        if (movingPiece.piece === PIECES.KING) {
            const rank = rankOfSquare(fromSquare);
            const fromFile = fileOfSquare(fromSquare);
            const toFile = fileOfSquare(toSquare);
            if (fromFile === FILES.FILE_E && toFile === FILES.FILE_G) {
                // Kingside castling
                // Move the rook
                undoInfo.isKingsideCastle = true;
                const fromRookSquare = createSquare(FILES.FILE_H, rank);
                const toRookSquare = createSquare(FILES.FILE_F, rank);
                this._squares[fromRookSquare] = null;
                this._squares[toRookSquare] = { piece: PIECES.ROOK, color: this.colorToMove };
                eventData.movingPieces.push({ from: fromRookSquare, to: toRookSquare, piece: this._squares[toRookSquare] });
            } else if (fromFile === FILES.FILE_E && toFile === FILES.FILE_C) {
                // Queenside castling
                // Move the rook
                undoInfo.isQueensideCastle = true;
                const fromRookSquare = createSquare(FILES.FILE_A, rank);
                const toRookSquare = createSquare(FILES.FILE_D, rank);
                this._squares[fromRookSquare] = null;
                this._squares[toRookSquare] = { piece: PIECES.ROOK, color: this.colorToMove };
                eventData.movingPieces.push({ from: fromRookSquare, to: toRookSquare, piece: this._squares[toRookSquare] });
            }
        }

        // Check if our move created an attack on the king
        // Generate all moves and determine if the king is attacked
        const oppositionKingSquare = this.getKingSquare(otherColor(this.colorToMove));
        this._inCheck = false;
        for (const mv of generatePseudoLegalMoves(this)) {
            if (mv.to === oppositionKingSquare) {
                this._inCheck = true;
                break;
            }
        }

        // Swap moving color
        this._colorToMove = otherColor(this.colorToMove);

        if (sendEvents) {
            this.movePlayed.trigger(eventData);
        }

        return undoInfo;
    }

    undoMove(move, undoInfo, animate = false, sendEvents = true) {
        assert(Boolean(move) && Boolean(undoInfo), "Invalid arguments");

        if (sendEvents) {
            if (movesEqual(move, MOVE_NONE)) {
                this.moveUndone.trigger(null);
            } else {
                const eventData = {
                    move,
                    animate,
                    movingPieces: [],
                    addedPieces: [],
                    promotedPieces: [],
                };
                const fromSquare = move.to;
                const toSquare = move.from;
                const movingPiece = this.getPieceOnSquare(fromSquare);
                const color = otherColor(this.colorToMove);
                // There must be a piece on the square unless it is atomic in which case it may have been exploded
                assert(Boolean(movingPiece) || this.isAtomic, "Invalid move");
                if (movingPiece) {
                    eventData.movingPieces.push({ from: fromSquare, to: toSquare, piece: undoInfo.movingPiece });
                } else {
                    eventData.movingPieces.push({ from: toSquare, to: toSquare, piece: undoInfo.movingPiece });
                }
                for (const piece of undoInfo.capturedPieces) {
                    eventData.addedPieces.push({ square: piece.square, piece: piece.piece, isMovingPiece: piece.isMovingPiece });
                }
                if (undoInfo.isPromotion) {
                    eventData.promotedPieces.push({ square: toSquare, piece: { piece: PIECES.PAWN, color } });
                }
                if (undoInfo.isKingsideCastle) {
                    // Move the rook back
                    const rank = rankOfSquare(fromSquare);
                    eventData.movingPieces.push({ from: createSquare(FILES.FILE_F, rank), to: createSquare(FILES.FILE_H, rank), piece: { piece: PIECES.ROOK, color } });
                }
                if (undoInfo.isQueensideCastle) {
                    // Move the rook back
                    const rank = rankOfSquare(fromSquare);
                    eventData.movingPieces.push({ from: createSquare(FILES.FILE_D, rank), to: createSquare(FILES.FILE_A, rank), piece: { piece: PIECES.ROOK, color } });
                }
                this.moveUndone.trigger(eventData);
            }
        }

        // Restore board state from undoInfo
        this._squares = [...undoInfo.squares];
        this._castlingRights = { ...undoInfo.castlingRights };
        this._inCheck = undoInfo.inCheck;
        this._enpassantSquare = undoInfo.enpassantSquare;
        this._kingSquares = [...undoInfo.kingSquares];

        this._colorToMove = otherColor(this.colorToMove);
    }

    // Determine whether the position is a draw or checkmate or still valid
    // This function is quite as expensive, as it calls isLegal() multiple times
    // performance is fine though
    getResult() {
        // Check if someones king got blown up
        if (this._kingSquares[COLORS.WHITE] === SQUARES.INVALID || this._kingSquares[COLORS.BLACK] === SQUARES.INVALID) {
            return this._kingSquares[COLORS.BLACK] === SQUARES.INVALID ? POSITION_STATE.WHITE_WIN : POSITION_STATE.BLACK_WIN;
        }

        // If only kings remain it is a draw
        let valid = false;
        for (const piece of this._squares) {
            if (piece && piece.piece !== PIECES.KING) {
                valid = true;
                break;
            }
        }
        if (!valid) {
            return POSITION_STATE.DRAW;
        }

        const moves = generatePseudoLegalMoves(this);
        let hasLegalMove = false;
        for (const mv of moves) {
            if (this.isLegal(mv)) {
                hasLegalMove = true;
                break;
            }
        }

        if (this.inCheck && !hasLegalMove) {
            return this.colorToMove === COLORS.BLACK ? POSITION_STATE.WHITE_WIN : POSITION_STATE.BLACK_WIN;
        }

        if (!this.inCheck && !hasLegalMove) {
            return POSITION_STATE.DRAW;
        }

        return POSITION_STATE.VALID;
    }

    _initialize() {
        // Find the king squares
        for (let square = 0; square < this._squares.length; square++) {
            const piece = this._squares[square];
            if (piece && piece.piece === PIECES.KING) {
                this._kingSquares[piece.color] = square;
            }
        }
        // Detect check
        this._inCheck = false;
        const kingSquare = this.getKingSquare(this.colorToMove);
        this._colorToMove = otherColor(this.colorToMove);
        const moves = generatePseudoLegalMoves(this);
        for (const move of moves) {
            if (move.to === kingSquare && this.isLegal(move)) {
                this._inCheck = true;
                break;
            }
        }
        this._colorToMove = otherColor(this.colorToMove);
    }
}

// Utility class for storing necessary information to manage the graphics/user interaction of a chess piece
class ChessPiece {
    constructor(pieceType, color, imageUri, square) {
        this.piece = pieceType;
        this.color = color;
        this.imageUri = imageUri;
        this.currentSquare = square;
        this.img = null;
    }

    // Used when a piece is promoted - updates <img> src
    setImageUri(uri, promise) {
        this.imageUri = uri;
        if (promise) {
            promise.then(() => {
                if (this.img) {
                    this.img.src = this.imageUri;
                }
            });
        } else if (this.img) {
            this.img.src = this.imageUri;
        }
    }
}

// Helper class for highlighting squares on the chess board
class SquareEmphasizer {
    constructor(chessBoard, enabled) {
        this._chessBoard = chessBoard;
        this._enabled = enabled;
        this._lightSquareColor = chessBoard.options.lightSquareHighlightColor;
        this._darkSquareColor = chessBoard.options.darkSquareHighlightColor;

        this._emphasizedSquares = [];

        // Square of the piece last grabbed by user
        this._lastGrab = null;

        this._lastMove1 = null;
        this._lastMove2 = null;
    }

    get enabled() {
        return this._enabled;
    }

    set enabled(enabled) {
        this._enabled = enabled;
        if (!enabled) {
            this.clear();
        }
    }

    setColors(lightColor, darkColor) {
        this._lightSquareColor = lightColor;
        this._darkSquareColor = darkColor;
        for (const square of this._emphasizedSquares) {
            this._updateSquareColor(square, this._getSquareColor(square));
        }
    }

    resetColors() {
        this.setColors(this._chessBoard.options.lightSquareHighlightColor, this._chessBoard.options.darkSquareHighlightColor);
    }

    // Call this when the user clicks on a piece
    onGrab(square) {
        if (this.enabled) {
            if (this._lastGrab !== null) {
                this._deemphasizeSquare(this._lastGrab);
            }

            const color = this._getSquareColor(square);
            this._emphasizeSquare(square, color);

            this._lastGrab = square;
        }
    }

    // Call this when the user moves a piece to a square
    onMove(square) {
        if (this.enabled) {
            if (this._lastMove1 !== null) {
                this._deemphasizeSquare(this._lastMove1);
            }
            if (this._lastMove2 !== null) {
                this._deemphasizeSquare(this._lastMove2);
            }

            const color = this._getSquareColor(square);
            this._emphasizeSquare(square, color);

            this._lastMove1 = this._lastGrab;
            this._lastMove2 = square;
            this._lastGrab = null;
        }
    }

    clear() {
        this._lastGrab = null;
        this._lastMove1 = null;
        this._lastMove2 = null;

        for (const square of this._emphasizedSquares) {
            this._updateSquareColor(square, this._getDefaultSquareColor(square));
        }
        this._emphasizedSquares = [];
    }

    _emphasizeSquare(square, color) {
        this._updateSquareColor(square, color);
        this._emphasizedSquares.push(square);
    }

    _deemphasizeSquare(square) {
        const color = this._getDefaultSquareColor(square);
        this._updateSquareColor(square, color);
        const index = this._emphasizedSquares.indexOf(square);
        if (index >= 0) {
            this._emphasizedSquares.splice(index, 1);
        }
    }

    _updateSquareColor(square, color) {
        const td = this._chessBoard._getTdFromSquare(square);
        td.style.backgroundColor = color;
    }

    _getSquareColor(square) {
        return squareColor(square) === COLORS.BLACK ? this._darkSquareColor : this._lightSquareColor;
    }

    _getDefaultSquareColor(square) {
        return squareColor(square) === COLORS.BLACK ? this._chessBoard._options.darkSquareColor : this._chessBoard._options.lightSquareColor;
    }
}

// Abstraction layer around the Position object which manages how the game is displayed to the user
// Also handles the interaction (being able to drag/drop pieces)
class ChessBoard {
    constructor(options) {
        this.movePlayed = new EventEmitter();

        this._options = assignDefaults(options, DEFAULT_CHESS_BOARD_OPTIONS);
        const targetElement = getElement(this._options.target);
        this._parentElement = null;
        this._boardElement = null;
        this._position = new Position();
        this._pieces = [];
        this._squareEmphasizer = new SquareEmphasizer(this, this._options.showSquareHighlights);

        // If flipped then we are seeing the board from Black's perspective
        this._flipped = false;
        this._moveMarkerDivs = [];

        this._moveHistory = [];
        this._historyIndex = -1;

        this._animationPromise = null;

        if (targetElement) {
            this.mount(targetElement);
        }

        // Setup event listeners so we can update our graphics when moves are made in the position

        this._position.movePlayed.addEventListener((moveData) => {
            if (moveData) {
                const shouldAnimate = this._options.useMoveAnimations && moveData.animate;

                // 1. Logically remove the pieces that were captured on this move (does NOT clean up the graphics of these pieces)
                const capturedPieceObjects = [];
                for (const piece of moveData.capturedPieces) {
                    const index = this._indexOfPieceOnSquare(piece.square);
                    if (index >= 0) {
                        capturedPieceObjects.push(this._pieces[index]);
                        this._pieces.splice(index, 1);
                    }
                }

                const promise = wait(this._options.animationTime);
                this._animationPromise = promise.then(() => {
                    this._animationPromise = null;
                });

                // For every other moving piece (rooks during castling) - not the primary moving piece
                // always animate to the new square
                for (const piece of moveData.movingPieces) {
                    const index = this._indexOfPieceOnSquare(piece.from);
                    if (index >= 0) {
                        this._movePieceToSquare(piece.to, this._pieces[index], this._options.useMoveAnimations ? promise : null);
                    }
                }

                // Find the piece that is the primary target of this move and make the move
                const movingPieceIndex = this._indexOfPieceOnSquare(moveData.move.from);
                let movingPieceObject = null;
                if (movingPieceIndex >= 0) {
                    movingPieceObject = this._pieces[movingPieceIndex];
                    this._movePieceToSquare(moveData.move.to, movingPieceObject, shouldAnimate ? promise : null);
                    if (moveData.movingPieceCaptured) {
                        // Logically remove the piece - not clean up graphics
                        this._pieces.splice(movingPieceIndex, 1);
                    }
                }

                const cleanupGraphics = () => {
                    // After movement has completed remove graphics of captured pieces
                    for (const piece of capturedPieceObjects) {
                        this._destroyPiece(piece);
                    }
                    // If this move resulted in the moving piece being exploded (capture in atomic chess)
                    // Now is the time to clean it up
                    if (moveData.movingPieceCaptured && movingPieceObject) {
                        this._destroyPiece(movingPieceObject);
                    }
                };

                if (shouldAnimate) {
                    // WAIT for movement to finish
                    promise.then(cleanupGraphics);
                } else {
                    cleanupGraphics();
                }

                // Update promotion graphics
                for (const promotion of moveData.promotedPieces) {
                    const index = this._indexOfPieceOnSquare(promotion.square);
                    if (index >= 0) {
                        this._pieces[index].piece = promotion.piece.piece;
                        this._pieces[index].setImageUri(this._getImageUri(promotion.piece.piece, promotion.piece.color), shouldAnimate ? promise : null);
                    }
                }

                // Debug getResult
                const state = this.position.getResult();
                switch (state) {
                case POSITION_STATE.BLACK_WIN:
                    console.log("Black Won");
                    break;
                case POSITION_STATE.WHITE_WIN:
                    console.log("White Won");
                    break;
                case POSITION_STATE.DRAW:
                    console.log("Draw");
                    break;
                }
            }
        });

        this._position.moveUndone.addEventListener((moveData) => {
            if (moveData) {
                const shouldAnimate = this._options.useMoveAnimations && moveData.animate;

                const promise = wait(this._options.animationTime);
                this._animationPromise = promise.then(() => {
                    this._animationPromise = null;
                });
                // Add pieces that were captured by the previous move
                for (const piece of moveData.addedPieces) {
                    const imageUri = this._getImageUri(piece.piece.piece, piece.piece.color);
                    const pieceObject = new ChessPiece(piece.piece.piece, piece.piece.color, imageUri, piece.square);
                    // In the case of atomic chess the moving piece may need to be added back (exploded when it captured another piece)
                    // In that case we still want to animate the piece moving from the capture square back to its old square
                    // However there is likely another piece already on the square (the piece we captured)
                    // Therefore before we create the piece we set its square to the capture square (move.to)
                    // and after its position has been update we set its actual square to the location it is about to move to
                    // Temporarily its graphical position and logical position are out of sync
                    if (piece.isMovingPiece && shouldAnimate) {
                        pieceObject.currentSquare = moveData.move.to;
                    }
                    // console.log(squareToString(piece.square), pieceObject.piece);
                    this._createPiece(pieceObject);
                    pieceObject.currentSquare = piece.square;
                    if (piece.isMovingPiece && shouldAnimate) {
                        this._movePieceToSquare(piece.square, pieceObject, promise, moveData.move.to);
                    }
                }

                // Moving pieces includes all pieces that need to be moved (including primary piece)
                // The primary piece is guaranteed to be index 0
                for (let i = 0; i < moveData.movingPieces.length; i++) {
                    const pieceData = moveData.movingPieces[i];
                    const index = this._indexOfPieceOnSquare(pieceData.from);
                    if (index >= 0 && pieceData.from !== pieceData.to) {
                        // Always animate if i > 0 (rook moves from castling)
                        const animateRook = i !== 0 && this._options.useMoveAnimations;
                        const movingPiece = this._pieces[index];
                        this._movePieceToSquare(pieceData.to, movingPiece, animateRook || shouldAnimate ? promise : null);
                    }
                }

                // Update promoted pieces
                for (const promotion of moveData.promotedPieces) {
                    const index = this._indexOfPieceOnSquare(promotion.square);
                    if (index >= 0) {
                        this._pieces[index].piece = promotion.piece.piece;
                        this._pieces[index].setImageUri(this._getImageUri(promotion.piece.piece, promotion.piece.color));
                    }
                }
            }
        });

        this._position.cleared.addEventListener(() => {
            this._squareEmphasizer.clear();
            this._destroyPieces();
            this._moveHistory = [];
            this._historyIndex = -1;
        });

        this._position.ready.addEventListener(() => {
            this._createPieces();
        });
    }

    get options() {
        return this._options;
    }

    get position() {
        return this._position;
    }

    get emphasizer() {
        return this._squareEmphasizer;
    }

    // Get the offset of the board from the left-border of the page
    get boardClientX() {
        return this._boardElement.getBoundingClientRect().x;
    }

    // Get the offset of the board from the top-border of the page
    get boardClientY() {
        return this._boardElement.getBoundingClientRect().y;
    }

    // Get the board width in pixels
    get boardClientWidth() {
        return this._boardElement.clientWidth;
    }

    // Get the board height in pixels
    get boardClientHeight() {
        return this._boardElement.clientHeight;
    }

    // Get the width of a square in pixels
    get squareClientWidth() {
        return this.boardClientWidth / FILE_COUNT;
    }

    // Get the height of a square in pixels
    get squareClientHeight() {
        return this.boardClientHeight / RANK_COUNT;
    }

    get isFlipped() {
        return this._flipped;
    }

    // Uses the pieces from our piece array not the underlying position
    get fen() {
        let result = "";
        for (let rank = RANK_COUNT - 1; rank >= 0; rank--) {
            let emptyCount = 0;
            for (let file = 0; file < FILE_COUNT; file++) {
                const square = createSquare(file, rank);
                const index = this._indexOfPieceOnSquare(square);
                if (index >= 0) {
                    if (emptyCount > 0) {
                        result += `${emptyCount}`;
                    }
                    emptyCount = 0;
                    const piece = this._pieces[index];
                    result += pieceToString(piece.piece, piece.color);
                } else {
                    emptyCount++;
                }
            }
            if (emptyCount > 0) {
                result += `${emptyCount}`;
            }
            if (rank !== 0) {
                result += "/";
            }
        }
        result += ` ${this.position.colorToMove === COLORS.WHITE ? "w" : "b"} `;
        let hasCastlingRights = false;
        if (this.position.canCastleKingside(COLORS.WHITE)) {
            result += "K";
            hasCastlingRights = true;
        }
        if (this.position.canCastleQueenside(COLORS.WHITE)) {
            result += "Q";
            hasCastlingRights = true;
        }
        if (this.position.canCastleKingside(COLORS.BLACK)) {
            result += "k";
            hasCastlingRights = true;
        }
        if (this.position.canCastleQueenside(COLORS.BLACK)) {
            result += "q";
            hasCastlingRights = true;
        }
        if (!hasCastlingRights) {
            result += "-";
        }
        result += ` ${this.position.enpassantSquare === SQUARES.INVALID ? "-" : squareToString(this.position.enpassantSquare)}`;
        return result;
    }

    async waitForAnimation() {
        if (this._animationPromise) {
            await this._animationPromise;
        }
    }

    // Flip the board to see from the other color's perspective
    flip() {
        this._flipped = !this._flipped;
        this.redraw();
    }

    setAtomic(isAtomic) {
        this.position.isAtomic = isAtomic;
    }

    // Used to mount the chess board later - even after it has been cleaned up
    mount(element) {
        if (!this._parentElement) {
            this._parentElement = element;
            this._create();
            this._createPieces();

            this._parentElement.onkeydown = (e) => {
                if (this._options.allowUndo) {
                    if (e.code === "ArrowLeft") {
                        this.undoLastMove();
                    }
                    if (e.code === "ArrowRight") {
                        this.redoMove();
                    }
                }
            };

            window.onresize = () => {
                this.redraw();
            };
        }
    }

    focus() {
        if (this._parentElement) {
            this._parentElement.focus();
        }
    }

    enableMoveMarkers() {
        this._options.showMoveMarkers = true;
    }

    disableMoveMarkers() {
        this._options.showMoveMarkers = false;
    }

    setInteractive(interactive) {
        this._options.interactive = interactive;
        if (interactive) {
            for (const piece of this._pieces) {
                this._makeInteractive(piece);
            }
        } else {
            for (const piece of this._pieces) {
                this._disableInteraction(piece);
            }
        }
    }

    // Redraws the board - may be required if the containing div is resized
    redraw() {
        this._create();
        this._createPieces();
    }

    hasPieceOnSquare(square) {
        return this._indexOfPieceOnSquare(square) >= 0;
    }

    // Set current board state from a Forsyth–Edwards Notation (FEN) string
    setFromFen(fen) {
        this.position.setFromFen(fen);
    }

    addPiece(pieceType, color, square, interactive = false) {
        this.removePiece(square);
        if (pieceType === PIECES.PAWN) {
            const rank = rankOfSquare(square);
            // Cannot place pawns on first or last rank
            if (rank === RANKS.RANK_1 || rank === RANKS.RANK_8) {
                return;
            }
        }
        const pieceObject = new ChessPiece(pieceType, color, this._getImageUri(pieceType, color), square);
        this._createPiece(pieceObject, interactive);
    }

    removePiece(square) {
        const index = this._indexOfPieceOnSquare(square);
        if (index >= 0) {
            const piece = this._pieces[index];
            this._destroyPiece(piece);
            this._pieces.splice(index, 1);
        }
    }

    updatePositionFromPieces(options) {
        const opts = assignDefaults(options, {
            colorToMove: COLORS.WHITE,
            whiteKingside: true,
            whiteQueenside: true,
            blackKingside: true,
            blackQueenside: true,
            enpassantSquare: SQUARES.INVALID,
        });
        this.position._colorToMove = opts.colorToMove;
        this.position._castlingRights.whiteKingside = opts.whiteKingside;
        this.position._castlingRights.whiteQueenside = opts.whiteQueenside;
        this.position._castlingRights.blackKingside = opts.blackKingside;
        this.position._castlingRights.blackQueenside = opts.blackQueenside;
        this.position._enpassantSquare = opts.enpassantSquare;
        this.position.setFromFen(this.fen);
    }

    // Cleanup and remove graphics from webpage
    cleanup() {
        this._moveHistory = [];
        this._destroyPieces();
        this._destroyBoard();
        this._position.reset();
        this._boardElement = null;
        this._parentElement = null;
    }

    // Utility function that converts a square to an absolute pixel position
    // Handles the orientation of the board
    squareToBoardPosition(square) {
        const file = fileOfSquare(square);
        const rank = rankOfSquare(square);
        const squareWidth = this.squareClientWidth;
        const squareHeight = this.squareClientHeight;

        const relX = (file + (this._flipped ? 1 : 0)) * squareWidth;
        const relY = (rank + (this._flipped ? 0 : 1)) * squareHeight;

        return {
            x: this._flipped ? this.boardClientWidth - relX : relX,
            y: this._flipped ? -this.boardClientHeight + relY : -relY,
        };
    }

    // Utility function that converts an absolute pixel position to a square
    // Returns SQUARES.INVALID if outside the bounds of the board
    // Handles the orientation of the board
    boardPositionToSquare(x, y) {
        const realX = this._flipped ? this.boardClientWidth - x : x;
        const realY = this._flipped ? y : this.boardClientHeight - y;
        const xIndex = Math.floor(realX / this.squareClientWidth);
        const yIndex = Math.floor(realY / this.squareClientHeight);
        if (xIndex < 0 || xIndex >= FILE_COUNT || yIndex < 0 || yIndex >= RANK_COUNT) {
            return SQUARES.INVALID;
        }
        return createSquare(xIndex, yIndex);
    }

    // Clears the pieces from the board
    clear() {
        this._moveHistory = [];
        this.hideMoveMarkers();
        this._destroyPieces();
        this._position.reset();
    }

    // Applies a given move - first checks that the move is a legal move
    applyMove(move, animate = false) {
        // The null move is always legal
        let isLegal = movesEqual(move, MOVE_NONE);
        this._squareEmphasizer.clear();
        if (!isLegal) {
            const pseudoLegalMoves = generatePseudoLegalMoves(this.position);
            for (const mv of pseudoLegalMoves) {
                if (movesEqual(mv, move) && this.position.isLegal(move)) {
                    isLegal = true;
                    break;
                }
            }
        }
        if (isLegal) {
            if (!movesEqual(move, MOVE_NONE)) {
                this._squareEmphasizer.onGrab(move.from);
                this._squareEmphasizer.onMove(move.to);
            }
            const undoInfo = this.position.applyMove(move, animate && this._options.useMoveAnimations);

            if (this._historyIndex < this._moveHistory.length - 1) {
                const expectedMove = this._moveHistory[this._historyIndex + 1];
                if (!movesEqual(move, expectedMove.move)) {
                    // We did not play the expected move - delete moves ahead of this one
                    this._moveHistory.length = this._historyIndex + 1;
                }
            }

            this._moveHistory.push({ move, undo: undoInfo });
            this._historyIndex++;

            this.movePlayed.trigger(move);
            return undoInfo;
        }
        console.log("Invalid move");
        return null;
    }

    redoMove() {
        if (this._historyIndex < this._moveHistory.length - 1) {
            this._historyIndex++;
            const moveInfo = this._moveHistory[this._historyIndex];
            moveInfo.undo = this.position.applyMove(moveInfo.move, this._options.useMoveAnimations);
            // When redoing a move, highlight the from and to squares
            this._squareEmphasizer.onGrab(moveInfo.move.from);
            this._squareEmphasizer.onMove(moveInfo.move.to);
        }
    }

    undoLastMove(tryAnimate = true) {
        if (this._historyIndex >= 0) {
            this._squareEmphasizer.clear();
            const moveInfo = this._moveHistory[this._historyIndex];
            this.position.undoMove(moveInfo.move, moveInfo.undo, this._options.useMoveAnimations && tryAnimate, true);
            this._historyIndex--;
        }
    }

    showMoveMarkers(square) {
        this.hideMoveMarkers();
        if (this._options.showMoveMarkers) {
            const pieceOnSquare = this.position.getPieceOnSquare(square);
            if (pieceOnSquare && pieceOnSquare.color === this.position.colorToMove) {
                const moves = generateMoves(pieceOnSquare.piece, square, pieceOnSquare.color, this.position);
                for (const move of moves) {
                    if (this.position.isLegal(move)) {
                        this._createMoveMarker(move);
                    }
                }
            }
        }
    }

    hideMoveMarkers() {
        for (const marker of this._moveMarkerDivs) {
            marker.remove();
        }
        this._moveMarkerDivs = [];
    }

    enableInteraction() {
        for (const piece of this._pieces) {
            this._makeInteractive(piece);
        }
    }

    disableInteraction() {
        for (const piece of this._pieces) {
            this._disableInteraction(piece);
        }
    }

    _createMoveMarker(move) {
        const isCapture = this.position.isCapture(move);
        const color = isCapture ? MOVE_MARKER_CAPTURE_COLOR : MOVE_MARKER_DEFAULT_COLOR;
        const scale = isCapture ? MOVE_MARKER_CAPTURE_SCALE : MOVE_MARKER_DEFAULT_SCALE;
        const div = this._createMoveMarkerDiv(color, scale);

        const td = this._getTdFromSquare(move.to);
        td.appendChild(div);

        this._moveMarkerDivs.push(div);
    }

    _createMoveMarkerDiv(color, scale) {
        const squareWidth = this.squareClientWidth;
        const squareHeight = this.squareClientHeight;
        const width = squareWidth * scale;
        const height = squareHeight * scale;

        const div = document.createElement("div");
        div.className = "ac-chess-marker";
        div.style.width = `${squareWidth}px`;
        div.style.height = `${squareHeight}px`;

        const ns = "http://www.w3.org/2000/svg";

        const svg = document.createElementNS(ns, "svg");
        svg.setAttributeNS(null, "viewBox", `0 0 ${squareWidth} ${squareHeight}`);
        const circle = document.createElementNS(ns, "circle");
        circle.setAttributeNS(null, "cx", `${squareWidth / 2}`);
        circle.setAttributeNS(null, "cy", `${squareHeight / 2}`);
        circle.setAttributeNS(null, "r", `${Math.min(width / 2, height / 2)}`);
        circle.setAttributeNS(null, "fill", color);
        svg.appendChild(circle);
        div.appendChild(svg);

        return div;
    }

    // Find the index of the piece that is on the given square
    // Returns -1 if the piece is not found
    _indexOfPieceOnSquare(square) {
        const index = this._pieces.findIndex(piece => piece.currentSquare === square);
        return index;
    }

    _destroyPieces() {
        for (const piece of this._pieces) {
            this._destroyPiece(piece);
        }
        this._pieces = [];
    }

    _destroyPiece(piece) {
        if (piece.img) {
            piece.img.remove();
        }
    }

    _destroyBoard() {
        if (this._parentElement) {
            assert(this._pieces.length === 0, "Must have destroyed all pieces before destroying board");
            this._parentElement.innerHTML = "";
            this._boardElement = null;
        }
    }

    // Helper function to create the HTML elements of the board
    _create() {
        this._destroyPieces();
        this._destroyBoard();
        if (this._parentElement) {
            const boardDiv = document.createElement("div");
            boardDiv.className = "ac-chess-board";
            const table = document.createElement("table");
            table.className = "ac-chess-board";

            for (let file = 0; file < FILE_COUNT; file++) {
                const row = document.createElement("tr");
                for (let rank = 0; rank < RANK_COUNT; rank++) {
                    const cell = document.createElement("td");
                    cell.style.backgroundColor = (file + rank) % 2 === 0 ? this._options.lightSquareColor : this._options.darkSquareColor;
                    row.appendChild(cell);
                }
                table.appendChild(row);
            }
            boardDiv.appendChild(table);
            this._parentElement.appendChild(boardDiv);

            this._boardElement = boardDiv;
        }
    }

    // Helper function to create the HTML elements for the pieces
    _createPieces() {
        this._destroyPieces();
        if (this._boardElement) {
            for (let i = 0; i < SQUARE_COUNT; i++) {
                const pieceData = this._position.getPieceOnSquare(i);
                if (Boolean(pieceData) && pieceData.piece !== PIECES.NONE) {
                    const pieceObject = new ChessPiece(pieceData.piece, pieceData.color, this._getImageUri(pieceData.piece, pieceData.color), i);
                    this._createPiece(pieceObject);
                }
            }
        }
    }

    // Constructs the HTML elements for rendering a single piece
    _createPiece(piece, interactive = true) {
        if (this._boardElement) {
            const img = this._createPieceImage(piece);
            // Piece now tracks its img
            piece.img = img;
            if (this._options.interactive && interactive) {
                this._makeInteractive(piece);
            } else {
                this._disableInteraction(piece);
            }
            this._pieces.push(piece);

            // Add img to the table
            const td = this._getTdFromSquare(piece.currentSquare);
            td.prepend(img);
        }
    }

    _createPieceImage(piece) {
        const image = document.createElement("img");
        const width = this.squareClientWidth;
        const height = this.squareClientHeight;
        image.style.width = `${width}px`;
        image.style.height = `${height}px`;
        image.src = piece.imageUri;
        image.className = "ac-chess-piece";
        return image;
    }

    _getTdFromSquare(square) {
        let row = RANK_COUNT - rankOfSquare(square) - 1;
        let col = fileOfSquare(square);
        if (this.isFlipped) {
            row = RANK_COUNT - row - 1;
            col = FILE_COUNT - col - 1;
        }
        const table = this._parentElement.getElementsByTagName("table")[0];
        const tr = table.getElementsByTagName("tr")[row];
        const td = tr.getElementsByTagName("td")[col];
        return td;
    }

    // Sets up mouse (and touch) event listeners so that a piece can be dragged/dropped
    // Requires piece to have a valid img
    _makeInteractive(piece) {
        assert(Boolean(piece.img), "Invalid piece");
        let currentPosition = this.squareToBoardPosition(piece.currentSquare);

        piece.img.style.pointerEvents = "auto";

        const removeEventListeners = () => {
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        };

        // Resets piece back to its original position before we started moving it
        const resetTransform = () => {
            this.hideMoveMarkers();
            this._endMovingPiece(piece);
            piece.img.style.transform = "translate(0px, 0px)";
        };

        // Set the piece position based on an absolute mouse position (from mousemove event)
        // Used to make the piece follow the cursor
        const setTransform = (clientX, clientY) => {
            const x = clientX - this.boardClientX - currentPosition.x - this.squareClientWidth / 2;
            const y = clientY - this.boardClientY - currentPosition.y - this.boardClientHeight - this.squareClientHeight / 2;
            piece.img.style.transform = `translate(${x}px, ${y}px)`;
        };

        // Snap the piece to the closest square to its current absolute position
        const placePiece = (clientX, clientY) => {
            this._endMovingPiece(piece);
            const square = this.boardPositionToSquare(clientX - this.boardClientX, clientY - this.boardClientY);
            let success;
            if (square !== SQUARES.INVALID && square !== piece.currentSquare) {
                const originalSquare = piece.currentSquare;
                const promotionRank = piece.color === COLORS.WHITE ? RANKS.RANK_8 : RANKS.RANK_1;
                const promotion = piece.piece === PIECES.PAWN && rankOfSquare(square) === promotionRank ? PIECES.QUEEN : PIECES.NONE;
                const move = createMove(originalSquare, square, promotion);
                success = Boolean(this.applyMove(move));
            }
            // Update piece transform
            this.hideMoveMarkers();
            if (!success) {
                resetTransform();
            }
            return success;
        };

        piece.img.onmousedown = (evt) => {
            // If we are dragging another piece ignore this drag
            if (document.onmouseup) {
                return;
            }
            evt.preventDefault();
            // Focus the board element
            this.focus();
            // Highlight the square the grabbed piece is on
            this._squareEmphasizer.onGrab(piece.currentSquare);
            this._beginMovingPiece(piece);
            // When we hold down the mouse on a piece, start dragging it
            // Show the available moves
            this.showMoveMarkers(piece.currentSquare);
            // Store current position
            currentPosition = this.squareToBoardPosition(piece.currentSquare);
            // Move the piece to the mouse location
            setTransform(evt.clientX, evt.clientY);

            // Setup event listeners
            document.onmouseup = (e) => {
                // When we drop the piece - snap to nearest square
                // If we dropped it outside of the board it will return to the original position
                placePiece(e.clientX, e.clientY);
                // Cleanup event listeners
                removeEventListeners();
            };

            document.onmousemove = (e) => {
                e.preventDefault();
                // Move piece to new mouse location
                setTransform(e.clientX, e.clientY);
            };
        };

        // Support mobile inputs
        piece.img.ontouchstart = (evt) => {
            if (evt.touches.length === 1) {
                // If we are dragging another piece ignore this drag
                if (document.ontouchend) {
                    return;
                }
                evt.preventDefault();
                // Focus board element
                this.focus();
                // Highlight the square the grabbed piece is on
                this._squareEmphasizer.onGrab(piece.currentSquare);
                this._beginMovingPiece(piece);
                // Show the available moves
                this.showMoveMarkers(piece.currentSquare);
                // Store current position
                currentPosition = this.squareToBoardPosition(piece.currentSquare);
                // Move the piece to the mouse location
                setTransform(evt.touches[0].clientX, evt.touches[0].clientY);

                document.ontouchend = (e) => {
                    if (e.changedTouches.length === 1) {
                        placePiece(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                    } else {
                        resetTransform();
                    }
                    removeEventListeners();
                };

                document.ontouchmove = (e) => {
                    if (e.changedTouches.length === 1) {
                        // Move piece to new location (track touches)
                        setTransform(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                    }
                };
            }
        };
    }

    // Prevent a piece from being dragged/dropped
    // Requires piece to have a valid img
    _disableInteraction(piece) {
        assert(Boolean(piece.img), "Invalid piece");
        piece.img.style.pointerEvents = "none";
    }

    _beginMovingPiece(piece) {
        if (piece.img) {
            // Draw the piece we are holding in front of the other pieces
            piece.img.style.zIndex = MOVING_PIECE_Z_INDEX_STRING;
        }
    }

    _endMovingPiece(piece) {
        if (piece.img) {
            piece.img.style.zIndex = DEFAULT_PIECE_Z_INDEX_STRING;
            piece.img.style.transform = "";
        }
    }

    // Sets the piece transform for a given square
    // fromSquareOverride is used in the case of atomic chess when there are 2 pieces created on the same square after undoing an explosion
    _movePieceToSquare(square, piece, animationPromise, fromSquareOverride = null) {
        if (piece.img) {
            if (animationPromise) {
                const fromSquare = fromSquareOverride || piece.currentSquare;
                piece.currentSquare = square;

                // Calculate the position of the target square relative to our current square
                const targetX = (fileOfSquare(piece.currentSquare) - fileOfSquare(fromSquare)) * this.squareClientWidth * (this.isFlipped ? -1 : 1);
                const targetY = -(rankOfSquare(piece.currentSquare) - rankOfSquare(fromSquare)) * this.squareClientHeight * (this.isFlipped ? -1 : 1);

                this._beginMovingPiece(piece);

                // Move towards the position of the new square
                piece.img.style.transition = `${this._options.animationTime}ms`;
                piece.img.style.transform = `translate(${targetX}px, ${targetY}px)`;
                animationPromise.then(() => {
                    if (piece.img) {
                        piece.img.style.transition = "";
                    }
                    this._endMovingPiece(piece);
                    // Add to new square
                    const newTd = this._getTdFromSquare(piece.currentSquare);
                    newTd.appendChild(piece.img);
                });
            } else {
                piece.currentSquare = square;
                const newTd = this._getTdFromSquare(piece.currentSquare);
                newTd.appendChild(piece.img);
            }
        }
    }

    // Get the URI for the image
    _getImageUri(piece, color) {
        const isWhite = color === COLORS.WHITE;
        const getFullPath = (path) => this._options.pieceImages.basePath + path;
        switch (piece) {
        case PIECES.PAWN:
            return getFullPath(isWhite ? this._options.pieceImages.whitePawn : this._options.pieceImages.blackPawn);
        case PIECES.KNIGHT:
            return getFullPath(isWhite ? this._options.pieceImages.whiteKnight : this._options.pieceImages.blackKnight);
        case PIECES.BISHOP:
            return getFullPath(isWhite ? this._options.pieceImages.whiteBishop : this._options.pieceImages.blackBishop);
        case PIECES.ROOK:
            return getFullPath(isWhite ? this._options.pieceImages.whiteRook : this._options.pieceImages.blackRook);
        case PIECES.QUEEN:
            return getFullPath(isWhite ? this._options.pieceImages.whiteQueen : this._options.pieceImages.blackQueen);
        case PIECES.KING:
            return getFullPath(isWhite ? this._options.pieceImages.whiteKing : this._options.pieceImages.blackKing);
        }
        return "";
    }
}
