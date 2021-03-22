const DEFAULT_CHESS_BOARD_OPTIONS = {
    target: "body",
    lightSquareColor: "#EEEEEE",
    darkSquareColor: "#6699FF",
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
};

// Constants that represent the current state of the board
const POSITION_STATE = Object.freeze({ VALID: 0, DRAW: 1, WHITE_WIN: 2, BLACK_WIN: 3 });

// Class that represents the state of the chess game (piece positions, castling rights, etc.)
// Does not handle any graphics/user interaction
class Position {

    constructor() {
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

    // Get the Forsyth–Edwards Notation (FEN) of the current position
    get fen() {
        return "";
    }

    isSquareOccupied(square) {
        return this.getPieceOnSquare(square) !== null
    }

    getPieceOnSquare(square) {
        assert(square >= 0 && square < this._squares.length, "Invalid square");
        return this._squares[square];
    }

    // Set the piece positions from a Forsyth–Edwards Notation (FEN) string
    setFromFen(fen) {
        this.reset();
        let currentFile = FILES.FILE_A;
        let currentRank = RANKS.RANK_8;
        for (let i = 0; i < fen.length; i++) {
            const c = fen[i];
            if (c === ' ') {
                break;
            }
            if (!isNaN(Number(c))) {
                const count = c.charCodeAt(0) - "0".charCodeAt(0);
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
    }

    // Clears pieces and resets castling rights
    reset() {
        this._squares = [];
        for (let i = 0; i < PIECE_COUNT; i++) {
            this._squares.push(null);
        }
        this._castlingRights = {
            whiteKingside: true,
            whiteQueenside: true,
            blackKingside: true,
            blackQueenside: true,
        };
        this._enpassantSquare = null;
        this._colorToMove = COLORS.WHITE;
    }

    applyMove(move) {
        assert(Boolean(move), "Invalid move");
    }

    undoMove(move, undoInfo) {
        assert(Boolean(move) && Boolean(undoInfo), "Invalid arguments");
    }

    // Determine whether the position is a draw or checkmate or still valid
    getResult() {
        return POSITION_STATE.VALID;
    }

}

// Utility class for storing necessary information to manage the graphics/user interaction of a chess piece
class ChessPiece {

    constructor(pieceType, color, imageUri, square) {
        this.type = pieceType;
        this.color = color;
        this.imageUri = imageUri;
        this.currentSquare = square;
        this.div = null;
    }

}

// Abstraction layer around the Position object which manages how the game is displayed to the user
// Also handles the interaction (being able to drag/drop pieces)
class ChessBoard {

    constructor(options) {
        this._options = assignDefaults(options, DEFAULT_CHESS_BOARD_OPTIONS);
        this._parentElement = getElement(this._options.target);
        this._position = new Position();
        this._pieces = [];

        // If flipped then we are seeing the board from Black's perspective
        this._flipped = false;

        if (this._parentElement) {
            this._create();
        }
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

    // Set current board state from a Forsyth–Edwards Notation (FEN) string
    setFromFen(fen) {
        this.clear();
        this.position.setFromFen(fen);
        this._createPieces();
    }

    // Cleanup and remove graphics from webpage
    cleanup() {
        this.clear();
        // TODO: remove board
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
        for (const piece of this._pieces) {
            if (piece.div) {
                piece.div.remove();
            }
        }
        this._pieces = [];
        this._position.reset();
    }

    // Helper function to create the HTML elements of the board
    _create() {
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

    // Helper function to create the HTML elements for the pieces
    _createPieces() {
        for (let i = 0; i < SQUARE_COUNT; i++) {
            const pieceData = this._position.getPieceOnSquare(i);
            if (Boolean(pieceData) && pieceData.piece !== PIECES.NONE) {
                const pieceObject = new ChessPiece(pieceData.piece, pieceData.color, this._getImageUri(pieceData.piece, pieceData.color), i);
                this._createPiece(pieceObject);
            }
        }
    }

    // Constructs the HTML elements for rendering a single piece
    _createPiece(piece) {
        const div = this._createPieceDiv(piece);
        // Add div to the board
        this._parentElement.appendChild(div);
        // Piece now tracks its div
        piece.div = div;
        if (this._options.interactive) {
            this._makeInteractive(piece);
        } else {
            this._disableInteraction(piece);
        }
        this._pieces.push(piece);
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

        // Resets piece back to its original position before we started moving it
        const resetTransform = () => {
            piece.div.style.transform = `translate(${currentPosition.x}px, ${currentPosition.y}px)`;
        }

        // Set the piece position based on an absolute mouse position (from mousemove event)
        // Used to make the piece follow the cursor
        const setTransform = (clientX, clientY) => {
            const x = clientX - this.boardClientX - this.squareClientWidth / 2;
            const y = clientY - this.boardClientY - this.boardClientHeight - this.squareClientHeight / 2;
            piece.div.style.transform = `translate(${x}px, ${y}px)`;
        }

        // Snap the piece to the closest square to its current absolute position
        const placePiece = (clientX, clientY) => {
            const square = this.boardPositionToSquare(clientX - this.boardClientX, clientY - this.boardClientY);
            if (square !== SQUARES.INVALID) {
                piece.currentSquare = square;
                // Set piece position to the square's position
                currentPosition = this.squareToBoardPosition(square);
                // TODO: validate this is a legal move
                // TODO: apply move
            }
            // Update piece transform
            resetTransform();
        }

        piece.div.onmousedown = (e) => {
            // When we hold down the mouse on a piece, start dragging it
            e.preventDefault();
            // If we are somehow dragging another piece - reset transform
            if (document.onmouseup) {
                resetTransform();
                document.onmouseup = null;
                document.onmousemove = null;
                return;
            }
            // Store current position
            currentPosition = this.squareToBoardPosition(piece.currentSquare);
            // Move the piece to the mouse location
            setTransform(e.clientX, e.clientY);

            // Setup event listeners
            document.onmouseup = (e) => {
                // When we drop the piece - snap to nearest square
                // If we dropped it outside of the board it will return to the original position
                placePiece(e.clientX, e.clientY);
                // Cleanup event listeners
                document.onmouseup = null;
                document.onmousemove = null;
            }

            document.onmousemove = (e) => {
                e.preventDefault();
                // Move piece to new mouse location
                setTransform(e.clientX, e.clientY);
            }
        }

        // TODO: touch events
    }

    // Prevent a piece from being dragged/dropped
    // Requires piece to have a valid div
    _disableInteraction(piece) {
        assert(Boolean(piece.div), "Invalid piece");
        piece.div.style.pointerEvents = "none";
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
// Set position from FEN (initial starting position)
board.setFromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR");
