const DEFAULT_CHESS_BOARD_OPTIONS = {
    target: "body",
    lightSquareColor: "#EEEEEE",
    darkSquareColor: "#4682B4",
    lightSquareHighlightColor: "#F6F669",
    darkSquareHighlightColor: "#BACA2B",
    pieceImages: {
        whitePawn:   "static/pieces/white_pawn.png",
        whiteKnight: "static/pieces/white_knight.png",
        whiteBishop: "static/pieces/white_bishop.png",
        whiteRook:   "static/pieces/white_rook.png",
        whiteQueen:  "static/pieces/white_queen.png",
        whiteKing:   "static/pieces/white_king.png",
        blackPawn:   "static/pieces/black_pawn.png",
        blackKnight: "static/pieces/black_knight.png",
        blackBishop: "static/pieces/black_bishop.png",
        blackRook:   "static/pieces/black_rook.png",
        blackQueen:  "static/pieces/black_queen.png",
        blackKing:   "static/pieces/black_king.png",
    },
    interactive: true,
    showMoveMarkers: true,
    allowUndo: true,
};

const MOVE_MARKER_DEFAULT_COLOR = "#22222266";
const MOVE_MARKER_CAPTURE_COLOR = "#AA222266";
const MOVE_MARKER_DEFAULT_SCALE = 0.3;
const MOVE_MARKER_CAPTURE_SCALE = 0.4;

const MOVE_ANIMATION_TIME_MS = 300;

// Format: [[files, ranks], ...]
const ATOMIC_EXPLOSION_VECTORS = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]];

// Constants that represent the current state of the board
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
        // (square, piece: { piece: PIECES, color: COLORS }, animate) => void
        this.pieceAdded = new EventEmitter();
        // (square, piece: { piece: PIECES, color: COLORS }, animate) => void
        this.pieceRemoved = new EventEmitter();
        // (from, to, piece: { piece: PIECES, color: COLORS }, animate) => void
        this.pieceMoved = new EventEmitter();
        // (square, piece: { piece: PIECES, color: COLORS }, animate) => void
        this.piecePromoted = new EventEmitter();
        // () => void
        this.cleared = new EventEmitter();

        this._isAtomic = false;
        this.reset();
    }

    get isAtomic() {
        return this._isAtomic;
    }

    set isAtomic(enabled) {
        this._isAtomic = enabled;
    }

    get colorToMove() {
        return this._colorToMove;
    }

    get enpassantSquare() {
        return this._enpassantSquare;
    }

    // Get the Forsyth–Edwards Notation (FEN) of the current position
    get fen() {
        return "";
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
        const ctm = this.colorToMove

        const kingsideCastle = this.isKingsideCastle(move);
        const queensideCastle = this.isQueensideCastle(move);
        if (kingsideCastle || queensideCastle) {
            // Can't castle when in check
            if (this.inCheck) {
                return false;
            }
            // Ensure that we are not castling through check
            const rank = rankOfSquare(move.from);
            const squares = []
            const pawnSquares = []
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
            // If our king is already next to the opposition king any move is legal
            if (isNextToSquare(ourKingSquare, otherKingSquare)) {
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
            if (c === ' ') {
                break;
            }
            const count = Number(c);
            if (!isNaN(count)) {
                currentFile += count;
            }
            if (c === '/') {
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

        while (index < fen.length && fen[index] !== ' ') {
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

        if (fen[index] !== '-') {
            this._enpassantSquare = squareFromString(fen.substr(index, 2));
            index += 3;
        } else {
            index += 2;
        }

        this._initialize();

        // Send creation events
        for (let square = 0; square < this._squares.length; square++) {
            const piece = this.getPieceOnSquare(square);
            if (piece) {
                this.pieceAdded.trigger(square, piece);
            }
        }
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
        };
        const fromSquare = move.from;
        const toSquare = move.to;
        const promotion = move.promotion;
        const enpassantSquare = this.enpassantSquare;
        const movingPiece = this.getPieceOnSquare(fromSquare);
        const isCapture = this.isCapture(move);
        assert(Boolean(movingPiece) && movingPiece.piece !== PIECES.NONE && movingPiece.color === this.colorToMove, "Invalid move");
        const capturedPiece = this.getPieceOnSquare(toSquare);
        assert(!Boolean(capturedPiece) || capturedPiece.color !== this.colorToMove, "Invalid capture");

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
                            undoInfo.capturedPieces.push({ square: newSquare, piece: pieceOnSquare });
                            this._squares[newSquare] = null;
                            if (sendEvents) {
                                this.pieceRemoved.trigger(newSquare, pieceOnSquare, animate);
                            }
                        }
                    }
                }
                // Explode the moving piece
                this._squares[explosionSquare] = null;
                undoInfo.capturedPieces.push({ square: captureFrom, piece: capturingPiece });
                if (sendEvents) {
                    // Trigger the event as if it was from the "from square" since the piece never actually moves
                    this.pieceRemoved.trigger(captureFrom, capturingPiece, animate);
                }
            }
        }

        // Reset enpassant square
        this._enpassantSquare = SQUARES.INVALID;

        // Clear the from square
        this._squares[fromSquare] = null;
        // Move to the new square (copy piece data)
        this._squares[toSquare] = { ...movingPiece };

        if (capturedPiece) {
            undoInfo.capturedPieces.push({ square: toSquare, piece: capturedPiece });
            explode(movingPiece, fromSquare, toSquare);
            if (sendEvents) {
                this.pieceRemoved.trigger(toSquare, capturedPiece, animate);
            }
        }

        // Enpassant
        if (toSquare === enpassantSquare && movingPiece.piece === PIECES.PAWN) {
            const captureSquare = getBackwardSquare(toSquare, this.colorToMove);
            const capturedPawn = { piece: PIECES.PAWN, color: otherColor(this.colorToMove) };
            undoInfo.capturedPieces.push({ square: captureSquare, piece: capturedPawn });
            this._squares[captureSquare] = null;
            explode(movingPiece, fromSquare, toSquare);
            if (sendEvents) {
                this.pieceRemoved.trigger(captureSquare, capturedPawn, animate);
            }
        }

        // A piece only "moves" in atomic if it is not a capture (otherwise it is exploded)
        if (sendEvents && (!this.isAtomic || !isCapture)) {
            this.pieceMoved.trigger(fromSquare, toSquare, movingPiece, animate);
        }

        // Update promotion
        if (promotion !== PIECES.NONE && movingPiece.piece === PIECES.PAWN) {
            this._squares[toSquare] = { piece: promotion, color: this.colorToMove };
            undoInfo.isPromotion = true;
            if (sendEvents) {
                this.piecePromoted.trigger(toSquare, this._squares[toSquare], animate);
            }
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
        if (capturedPiece && capturedPiece.piece === PIECES.ROOK) {
            const requiredRank = this.colorToMove === COLORS.WHITE ? RANKS.RANK_8 : RANKS.RANK_1;
            const fromFile = fileOfSquare(toSquare);
            const fromRank = rankOfSquare(toSquare);
            if (fromFile === FILES.FILE_H && requiredRank === fromRank) {
                if (this.colorToMove === COLORS.WHITE) {
                    this._castlingRights.blackKingside = false;
                } else {
                    this._castlingRights.whiteKingside = false;
                }
            } else if (fromFile === FILES.FILE_A && requiredRank === fromRank) {
                if (this.colorToMove === COLORS.WHITE) {
                    this._castlingRights.blackQueenside = false;
                } else {
                    this._castlingRights.whiteQueenside = false;
                }
            }
        }

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
                if (sendEvents) {
                    // Always animate rook moves in castling
                    this.pieceMoved.trigger(fromRookSquare, toRookSquare, this._squares[toRookSquare], true);
                }
            } else if (fromFile === FILES.FILE_E && toFile === FILES.FILE_C) {
                // Queenside castling
                // Move the rook
                undoInfo.isQueensideCastle = true;
                const fromRookSquare = createSquare(FILES.FILE_A, rank);
                const toRookSquare = createSquare(FILES.FILE_D, rank);
                this._squares[fromRookSquare] = null;
                this._squares[toRookSquare] = { piece: PIECES.ROOK, color: this.colorToMove };
                if (sendEvents) {
                    // Always animate rook moves in castling
                    this.pieceMoved.trigger(fromRookSquare, toRookSquare, this._squares[toRookSquare], true);
                }
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

        return undoInfo;
    }

    undoMove(move, undoInfo, animate = false, sendEvents = true) {
        assert(Boolean(move) && Boolean(undoInfo), "Invalid arguments");

        if (sendEvents) {
            const fromSquare = move.to;
            const toSquare = move.from;
            const movingPiece = this.getPieceOnSquare(fromSquare);
            const color = otherColor(this.colorToMove);
            // There must be a piece on the square unless it is atomic in which case it may have been exploded
            assert(Boolean(movingPiece) || this.isAtomic, "Invalid move");
            if (movingPiece) {
                this.pieceMoved.trigger(fromSquare, toSquare, movingPiece, animate);
            }
            for (const piece of undoInfo.capturedPieces) {
                this.pieceAdded.trigger(piece.square, piece.piece);
            }
            if (undoInfo.isPromotion) {
                this.piecePromoted.trigger(toSquare, { piece: PIECES.PAWN, color }, animate);
            }
            if (undoInfo.isKingsideCastle) {
                // Move the rook back
                const rank = rankOfSquare(fromSquare);
                this.pieceMoved.trigger(createSquare(FILES.FILE_F, rank), createSquare(FILES.FILE_H, rank), { piece: PIECES.ROOK, color }, animate);
            }
            if (undoInfo.isQueensideCastle) {
                // Move the rook back
                const rank = rankOfSquare(fromSquare);
                this.pieceMoved.trigger(createSquare(FILES.FILE_D, rank), createSquare(FILES.FILE_A, rank), { piece: PIECES.ROOK, color }, animate);
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
    getResult() {
        // TODO: determine checkmate
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
        // TODO: Detect if position is in check
    }

}

// Utility class for storing necessary information to manage the graphics/user interaction of a chess piece
class ChessPiece {

    constructor(pieceType, color, imageUri, square) {
        this.piece = pieceType;
        this.color = color;
        this.imageUri = imageUri;
        this.currentSquare = square;
        this.div = null;
    }

    // Used when a piece is promoted - updates <img> src
    setImageUri(uri) {
        this.imageUri = uri;
        if (this.div) {
            this.div.children[0].src = this.imageUri;
        }
    }

}

// Helper class for highlighting squares on the chess board
class SquareEmphasizer {

    constructor(chessBoard) {
        this._chessBoard = chessBoard;

        // Square of the piece last grabbed by user
        this._lastGrab = null;

        this._lastMove1 = null;
        this._lastMove2 = null;

        this._emphasizedSquares = [];
    }

    // Call this when the user clicks on a piece
    onGrab(square) {
        const color = squareColor(square) === COLORS.BLACK ? this._chessBoard._options.darkSquareHighlightColor : this._chessBoard._options.lightSquareHighlightColor;
        this._emphasizeSquare(square, color);

        if (this._lastGrab !== null) {
            this._deemphasizeSquare(this._lastGrab);
        }
        this._lastGrab = square;
    }

    // Call this when the user moves a piece to a square
    onMove(square) {
        if (this._lastMove1 !== null) {
            this._deemphasizeSquare(this._lastMove1);
        }
        if (this._lastMove2 !== null) {
            this._deemphasizeSquare(this._lastMove2);
        }

        const color = squareColor(square) === COLORS.BLACK ? this._chessBoard._options.darkSquareHighlightColor : this._chessBoard._options.lightSquareHighlightColor;
        this._emphasizeSquare(square, color);

        this._lastMove1 = this._lastGrab;
        this._lastMove2 = square;
        this._lastGrab = null;
    }

    clear() {
        for (const emph of this._emphasizedSquares) {
            emph.div.remove();
        }
        this._lastGrab = null;
        this._lastMove1 = null;
        this._lastMove2 = null;
        this._emphasizedSquares = [];
    }

    _emphasizeSquare(square, color) {
        const squareWidth = this._chessBoard.squareClientWidth;
        const squareHeight = this._chessBoard.squareClientHeight;

        const div = document.createElement("div");
        div.className = "highlight-square";
        const clientPosition = this._chessBoard.squareToBoardPosition(square);
        div.style.transform = `translate(${clientPosition.x}px, ${clientPosition.y}px)`;
        div.style.width = `${squareWidth}px`;
        div.style.height = `${squareHeight}px`;
        div.style.backgroundColor = color;

        this._chessBoard._parentElement.appendChild(div);
        this._emphasizedSquares.push({ "square": square, "div": div });
    }

    _deemphasizeSquare(square) {
        const emph = this._emphasizedSquares;
        for (const index in emph) {
            if (emph[index].square == square) {
                emph[index].div.remove();
                emph.splice(index, 1);
                return;
             }
        }
    }
}

// Abstraction layer around the Position object which manages how the game is displayed to the user
// Also handles the interaction (being able to drag/drop pieces)
class ChessBoard {

    constructor(options) {
        this._options = assignDefaults(options, DEFAULT_CHESS_BOARD_OPTIONS);
        const targetElement = getElement(this._options.target)
        this._parentElement = null;
        this._position = new Position();
        this._pieces = [];
        this._squareEmphasizer = new SquareEmphasizer(this);

        // If flipped then we are seeing the board from Black's perspective
        this._flipped = false;
        this._moveMarkerDivs = [];

        this._moveHistory = [];
        this._historyIndex = -1;

        if (targetElement) {
            this.mount(targetElement);
        }

        // Setup event listeners so we can update our graphics when moves are made in the position

        this._position.pieceAdded.addEventListener((square, piece, animate) => {
            const pieceObject = new ChessPiece(piece.piece, piece.color, this._getImageUri(piece.piece, piece.color), square);
            this._createPiece(pieceObject, animate);
        })

        this._position.pieceRemoved.addEventListener((square, piece, animate) => {
            const pieceIndex = this._indexOfPieceOnSquare(square);
            if (pieceIndex >= 0) {
                const pieceObject = this._pieces[pieceIndex];
                this._pieces.splice(pieceIndex, 1);
                this._destroyPiece(pieceObject);
            }
        })

        this._position.pieceMoved.addEventListener((from, to, piece, animate) => {
            const pieceIndex = this._indexOfPieceOnSquare(from);
            if (pieceIndex >= 0) {
                const pieceObject = this._pieces[pieceIndex];
                this._movePieceToSquare(to, pieceObject, animate);
            }
        })

        this._position.piecePromoted.addEventListener((square, piece, animate) => {
            const image = this._getImageUri(piece.piece, piece.color);
            const pieceIndex = this._indexOfPieceOnSquare(square);
            if (pieceIndex >= 0) {
                const pieceObject = this._pieces[pieceIndex];
                pieceObject.setImageUri(image);
            }
        })

        this._position.cleared.addEventListener(() => {
            this._destroyPieces();
            this._moveHistory = [];
        })
    }

    get position() {
        return this._position;
    }

    // Get the offset of the board from the left-border of the page
    get boardClientX() {
        return this._parentElement.getBoundingClientRect().x;
    }

    // Get the offset of the board from the top-border of the page
    get boardClientY() {
        return this._parentElement.getBoundingClientRect().y;
    }

    // Get the board width in pixels
    get boardClientWidth() {
        return this._parentElement.clientWidth;
    }

    // Get the board height in pixels
    get boardClientHeight() {
        return this._parentElement.clientHeight;
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

    // Redraws the board - may be required if the containing div is resized
    redraw() {
        this._create();
        this._createPieces();
    }

    // Set current board state from a Forsyth–Edwards Notation (FEN) string
    setFromFen(fen) {
        this.position.setFromFen(fen);
    }

    // Cleanup and remove graphics from webpage
    cleanup() {
        this._moveHistory = [];
        this._destroyPieces();
        this._destroyBoard();
        this._position.reset();
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
        }
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
    applyMove(move) {
        const pseudoLegalMoves = generatePseudoLegalMoves(this.position);
        for (const mv of pseudoLegalMoves) {
            if (movesEqual(mv, move) && this.position.isLegal(move)) {
                const undoInfo = this.position.applyMove(move);

                if (this._historyIndex < this._moveHistory.length - 1) {
                    const expectedMove = this._moveHistory[this._historyIndex + 1];
                    if (!movesEqual(move, expectedMove.move)) {
                        // We did not play the expected move - delete moves ahead of this one
                        this._moveHistory.length = this._historyIndex + 1;
                    }
                }

                this._moveHistory.push({ move, undo: undoInfo });
                this._historyIndex++;
                return undoInfo;
            }
        }
        console.log("Invalid move");
        return null;
    }

    redoMove() {
        if (this._historyIndex < this._moveHistory.length - 1) {
            this._historyIndex++;
            const moveInfo = this._moveHistory[this._historyIndex];
            moveInfo.undo = this.position.applyMove(moveInfo.move, true);
            this._squareEmphasizer.onGrab(moveInfo.move.from);
            this._squareEmphasizer.onMove(moveInfo.move.to);
        }
    }

    undoLastMove() {
        if (this._historyIndex >= 0) {
            this._squareEmphasizer.clear();
            const moveInfo = this._moveHistory[this._historyIndex];
            this.position.undoMove(moveInfo.move, moveInfo.undo, true, true);
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

    _createMoveMarker(move) {
        const isCapture = this.position.isCapture(move);
        const color = isCapture ? MOVE_MARKER_CAPTURE_COLOR : MOVE_MARKER_DEFAULT_COLOR;
        const scale = isCapture ? MOVE_MARKER_CAPTURE_SCALE : MOVE_MARKER_DEFAULT_SCALE;
        const div = this._createMoveMarkerDiv(move.to, color, scale);

        this._parentElement.appendChild(div);
        this._moveMarkerDivs.push(div);
    }

    _createMoveMarkerDiv(square, color, scale) {
        const squareWidth = this.squareClientWidth;
        const squareHeight = this.squareClientHeight;
        const width = squareWidth * scale;
        const height = squareHeight * scale;

        const div = document.createElement("div");
        div.className = "chess-marker";
        const clientPosition = this.squareToBoardPosition(square);
        div.style.transform = `translate(${clientPosition.x}px, ${clientPosition.y}px)`;
        div.style.width = `${squareWidth}px`;
        div.style.height = `${squareHeight}px`;

        const ns = "http://www.w3.org/2000/svg";

        const svg = document.createElementNS(ns, "svg");
        svg.setAttributeNS(null, 'viewBox', `0 0 ${squareWidth} ${squareHeight}`);
        const circle = document.createElementNS(ns, "circle");
        circle.setAttributeNS(null, 'cx', `${squareWidth / 2}`);
        circle.setAttributeNS(null, 'cy', `${squareHeight / 2}`);
        circle.setAttributeNS(null, 'r', `${Math.min(width / 2, height / 2)}`);
        circle.setAttributeNS(null, 'fill', color);
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
        if (piece.div) {
            piece.div.remove();
        }
    }

    _destroyBoard() {
        if (this._parentElement) {
            assert(this._pieces.length === 0, "Must have destroyed all pieces before destroying board");
            this._parentElement.innerHTML = "";
        }
    }

    // Helper function to create the HTML elements of the board
    _create() {
        this._destroyPieces();
        this._destroyBoard();
        if (this._parentElement) {
            const table = document.createElement("table");
            table.className = "chess-board";
            for (let file = 0; file < FILE_COUNT; file++) {
                const row = document.createElement("tr");
                for (let rank = 0; rank < RANK_COUNT; rank++) {
                    const cell = document.createElement("td");
                    cell.style.backgroundColor = (file + rank) % 2 === 0 ? this._options.lightSquareColor : this._options.darkSquareColor;
                    row.appendChild(cell);
                }
                table.appendChild(row);
            }
            this._parentElement.appendChild(table);
        }
    }

    // Helper function to create the HTML elements for the pieces
    _createPieces() {
        this._destroyPieces();
        if (this._parentElement) {
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
    _createPiece(piece, animate = false) {
        if (this._parentElement) {
            const div = this._createPieceDiv(piece);
            // Piece now tracks its div
            piece.div = div;
            if (this._options.interactive) {
                this._makeInteractive(piece);
            } else {
                this._disableInteraction(piece);
            }
            this._pieces.push(piece);

            // Add div to the board
            this._parentElement.appendChild(div);
        }
    }

    _createPieceImage(piece, width, height) {
        const image = document.createElement("img");
        image.style.width = `${width}px`;
        image.style.height = `${height}px`;
        image.src = piece.imageUri;
        return image;
    }

    _createPieceDiv(piece) {
        const width = this.squareClientWidth;
        const height = this.squareClientHeight;
        const div = document.createElement("div");
        div.style.width = `${width}px`;
        div.style.height = `${height}px`;
        div.className = "chess-piece";
        const piecePosition = this.squareToBoardPosition(piece.currentSquare);
        div.style.transform = `translate(${piecePosition.x}px, ${piecePosition.y}px)`;
        const image = this._createPieceImage(piece, width, height);
        div.appendChild(image);
        return div;
    }

    // Sets up mouse (and touch) event listeners so that a piece can be dragged/dropped
    // Requires piece to have a valid div
    _makeInteractive(piece) {
        assert(Boolean(piece.div), "Invalid piece");
        let currentPosition = this.squareToBoardPosition(piece.currentSquare);

        const removeEventListeners = () => {
            this._parentElement.onmouseup = null;
            this._parentElement.onmousemove = null;
            this._parentElement.ontouchend = null;
            this._parentElement.ontouchmove = null;
        };

        // Resets piece back to its original position before we started moving it
        const resetTransform = () => {
            this.hideMoveMarkers();
            piece.div.style.transform = `translate(${currentPosition.x}px, ${currentPosition.y}px)`;
        };

        // Set the piece position based on an absolute mouse position (from mousemove event)
        // Used to make the piece follow the cursor
        const setTransform = (clientX, clientY) => {
            const x = clientX - this.boardClientX - this.squareClientWidth / 2;
            const y = clientY - this.boardClientY - this.boardClientHeight - this.squareClientHeight / 2;
            piece.div.style.transform = `translate(${x}px, ${y}px)`;
        };

        // Snap the piece to the closest square to its current absolute position
        const placePiece = (clientX, clientY) => {
            const square = this.boardPositionToSquare(clientX - this.boardClientX, clientY - this.boardClientY);
            let success;
            if (square !== SQUARES.INVALID && square !== piece.currentSquare) {
                const originalSquare = piece.currentSquare;
                const promotionRank = piece.color === COLORS.WHITE ? RANKS.RANK_8 : RANKS.RANK_1;
                const promotion = piece.piece === PIECES.PAWN && rankOfSquare(square) === promotionRank ? PIECES.QUEEN : PIECES.NONE;
                const move = createMove(originalSquare, square, promotion);
                success = Boolean(this.applyMove(move));
                if (success) {
                    // Set piece position to the square's position
                    currentPosition = this.squareToBoardPosition(square);
                }
            }
            // Update piece transform
            resetTransform();
            return success;
        };

        piece.div.onmousedown = (e) => {
            e.preventDefault();

            // Highlight the square the grabbed piece is on
            this._squareEmphasizer.onGrab(piece.currentSquare);

            // Draw the piece we are holding in front of the other pieces
            piece.div.style.zIndex = "20";
            // Show the available moves
            this.showMoveMarkers(piece.currentSquare);
            // If we are dragging another piece ignore this drag
            if (this._parentElement.onmouseup) {
                return;
            }
            this.focus();
            // When we hold down the mouse on a piece, start dragging it
            // Show the available moves
            this.showMoveMarkers(piece.currentSquare);
            // Store current position
            currentPosition = this.squareToBoardPosition(piece.currentSquare);
            // Move the piece to the mouse location
            setTransform(e.clientX, e.clientY);

            // Setup event listeners
            this._parentElement.onmouseup = (e) => {
                // When we drop the piece - snap to nearest square
                // If we dropped it outside of the board it will return to the original position
                if (placePiece(e.clientX, e.clientY)) {
                    // Highlight the move
                    const square = this.boardPositionToSquare(e.clientX - this.boardClientX, e.clientY - this.boardClientY);
                    this._squareEmphasizer.onMove(square);
                }
                // Cleanup event listeners
                removeEventListeners();

                // Set the z-index of the piece back to its default
                piece.div.style.zIndex = "";
            };

            this._parentElement.onmousemove = (e) => {
                e.preventDefault();
                // Move piece to new mouse location
                setTransform(e.clientX, e.clientY);
            };
        };

        // Support mobile inputs
        piece.div.ontouchstart = (e) => {
            if (e.touches.length === 1) {
                e.preventDefault();

                // If we are dragging another piece ignore this drag
                if (this._parentElement.ontouchend) {
                    return;
                }

                this.focus();
                // Show the available moves
                this.showMoveMarkers(piece.currentSquare);
                // Store current position
                currentPosition = this.squareToBoardPosition(piece.currentSquare);
                // Move the piece to the mouse location
                setTransform(e.touches[0].clientX, e.touches[0].clientY);

                this._parentElement.ontouchend = (e) => {
                    if (e.changedTouches.length === 1) {
                        placePiece(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
                    } else {
                        resetTransform();
                    }
                    removeEventListeners();
                };

                this._parentElement.ontouchmove = (e) => {
                    if (e.changedTouches.length === 1) {
                        // Move piece to new location (track touches)
                        setTransform(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
                    }
                };
            }
        };
    }

    // Prevent a piece from being dragged/dropped
    // Requires piece to have a valid div
    _disableInteraction(piece) {
        assert(Boolean(piece.div), "Invalid piece");
        piece.div.style.pointerEvents = "none";
    }

    // Sets the piece transform for a given square
    _movePieceToSquare(square, piece, animate) {
        if (piece.div) {
            const position = this.squareToBoardPosition(square);
            if (animate) {
                piece.div.style.transition = `${MOVE_ANIMATION_TIME_MS}ms`;
                setTimeout(() => {
                    if (piece.div) {
                        piece.div.style.transition = "";
                    }
                }, MOVE_ANIMATION_TIME_MS)
            }
            piece.div.style.transform = `translate(${position.x}px, ${position.y}px)`;
        }
        piece.currentSquare = square;
    }

    // Get the URI for the image
    _getImageUri(piece, color) {
        const isWhite = color === COLORS.WHITE;
        switch (piece) {
            case PIECES.PAWN:
                return isWhite ? this._options.pieceImages.whitePawn : this._options.pieceImages.blackPawn;
            case PIECES.KNIGHT:
                return isWhite ? this._options.pieceImages.whiteKnight : this._options.pieceImages.blackKnight;
            case PIECES.BISHOP:
                return isWhite ? this._options.pieceImages.whiteBishop : this._options.pieceImages.blackBishop;
            case PIECES.ROOK:
                return isWhite ? this._options.pieceImages.whiteRook : this._options.pieceImages.blackRook;
            case PIECES.QUEEN:
                return isWhite ? this._options.pieceImages.whiteQueen : this._options.pieceImages.blackQueen;
            case PIECES.KING:
                return isWhite ? this._options.pieceImages.whiteKing : this._options.pieceImages.blackKing;
        }
        return ""
    }

}

// Create a chess board inside the #board element
const board = new ChessBoard({ target: "#board" });
board.setAtomic(true);
// Set position from FEN (initial starting position)
board.setFromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
// board.setFromFen("8/8/8/3N4/4n3/8/8/8 w - - 0 1");