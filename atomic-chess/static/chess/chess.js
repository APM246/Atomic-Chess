// Defines constants that represent the 64 squares of the chess board
const SQUARES = Object.freeze({
    A1:  0, B1:  1, C1:  2, D1:  3, E1:  4, F1:  5, G1:  6, H1:  7,
    A2:  8, B2:  9, C2: 10, D2: 11, E2: 12, F2: 13, G2: 14, H2: 15,
    A3: 16, B3: 17, C3: 18, D3: 19, E3: 20, F3: 21, G3: 22, H3: 23,
    A4: 24, B4: 25, C4: 26, D4: 27, E4: 28, F4: 29, G4: 30, H4: 31,
    A5: 32, B5: 33, C5: 34, D5: 35, E5: 36, F5: 37, G5: 38, H5: 39,
    A6: 40, B6: 41, C6: 42, D6: 43, E6: 44, F6: 45, G6: 46, H6: 47,
    A7: 48, B7: 49, C7: 50, D7: 51, E7: 52, F7: 53, G7: 54, H7: 55,
    A8: 56, B8: 57, C8: 58, D8: 59, E8: 60, F8: 61, G8: 62, H8: 63,
    INVALID: -1,
});

const FILE_COUNT = 8;
const RANK_COUNT = 8;
const SQUARE_COUNT = FILE_COUNT * RANK_COUNT;

// Helpful enums for chess board constants
const FILES = Object.freeze({ FILE_A: 0, FILE_B: 1, FILE_C: 2, FILE_D: 3, FILE_E: 4, FILE_F: 5, FILE_G: 6, FILE_H: 7 });
const RANKS = Object.freeze({ RANK_1: 0, RANK_2: 1, RANK_3: 2, RANK_4: 3, RANK_5: 4, RANK_6: 5, RANK_7: 6, RANK_8: 7 });
const COLORS = Object.freeze({ WHITE: 0, BLACK: 1 });
const COLOR_COUNT = 2;
const PIECES = Object.freeze({ NONE: -1, PAWN: 0, KNIGHT: 1, BISHOP: 2, ROOK: 3, QUEEN: 4, KING: 5 });
const PIECE_COUNT = 6;
const PROMOTION_PIECE_TYPES = [PIECES.QUEEN, PIECES.ROOK, PIECES.BISHOP, PIECES.KNIGHT];

// Move generation vectors
// Format: [Files, Ranks]
const KNIGHT_MOVE_VECTORS = [[-1, 2], [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1]];
const BISHOP_MOVE_VECTORS = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
const ROOK_MOVE_VECTORS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
const KING_MOVE_VECTORS = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]];

// Utility function to create a square from a given file and rank
function createSquare(file, rank) {
    if (file < 0 || file >= FILE_COUNT || rank < 0 || rank >= RANK_COUNT) {
        return SQUARES.INVALID;
    }
    return file + (rank * FILE_COUNT);
}

function fileOfSquare(square) {
    assert(square !== SQUARES.INVALID, "Invalid square");
    return square & 0x7;
}

function rankOfSquare(square) {
    assert(square !== SQUARES.INVALID, "Invalid square");
    return square >> 3;
}

function validFileAndRank(file, rank) {
    return file >= 0 && file < FILE_COUNT && rank >= 0 && rank < RANK_COUNT;
}

// Returns the square directly in front of the given square with respect to the color
// eg. getForwardSquare(SQUARES.A2, COLORS.WHITE) === SQUARES.A3
//     getForwardSquare(SQUARES.A2, COLORS.BLACK) === SQUARES.A1
function getForwardSquare(square, color) {
    assert(square !== SQUARES.INVALID, "Invalid square");
    assert((color === COLORS.WHITE || rankOfSquare(square) !== RANKS.RANK_1) && (color === COLORS.BLACK || rankOfSquare(square) !== RANKS.RANK_8), "Invalid rank");
    return square + (color === COLORS.WHITE ? FILE_COUNT : -FILE_COUNT);
}

// Returns the square to the left of the given respect with respect to WHITE
// eg. getLeftSquare(SQUARES.E4) === SQUARES.D4
function getLeftSquare(square) {
    if (fileOfSquare(square) === FILES.FILE_A) {
        return SQUARES.INVALID;
    }
    return square - 1;
}

// Returns the square to the right of the given respect with respect to WHITE
// eg. getLeftSquare(SQUARES.E4) === SQUARES.F4
function getRightSquare(square) {
    if (fileOfSquare(square) === FILES.FILE_H) {
        return SQUARES.INVALID;
    }
    return square + 1;
}

function otherColor(color) {
    return color === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK;
}

function createMove(fromSquare, toSquare, promotion = PIECES.NONE) {
    assert(fromSquare !== toSquare, "Invalid move");
    assert(fromSquare !== SQUARES.INVALID && toSquare !== SQUARES.INVALID, "Invalid from or to square");
    return {
        from: fromSquare,
        to: toSquare,
        promotion,
    }
}

// Compares the equality of 2 moves
function movesEqual(move1, move2) {
    if (!move1 || !move2) {
        return move1 === move2;
    }
    return move1.from === move2.from && move1.to === move2.to && move1.promotion === move2.promotion;
}

// Generates all pseudo-legal pawn moves from a given square
function generatePawnMoves(square, color, position) {
    const moves = [];
    // Detect if we are making a move resulting in a promotion
    const promotionRank = color === COLORS.WHITE ? RANKS.RANK_8 : RANKS.RANK_1;
    // Detect if we can push 2 squares forward
    const doublePushRank = color === COLORS.WHITE ? RANKS.RANK_2 : RANKS.RANK_7;
    const forwardSquare = getForwardSquare(square, color);
    const toRank = rankOfSquare(forwardSquare);
    const isPromotion = toRank === promotionRank
    // If there is no piece directly in front of us then we can move forward
    if (!position.isSquareOccupied(forwardSquare)) {
        // Handle pushing to promote
        if (isPromotion) {
            for (const promotion of PROMOTION_PIECE_TYPES) {
                moves.push(createMove(square, forwardSquare, promotion));
            }
        } else {
            moves.push(createMove(square, forwardSquare));
            const fromRank = rankOfSquare(square);
            // If we can push 2 squares forward
            if (fromRank === doublePushRank) {
                const doubleForwardSquare = getForwardSquare(forwardSquare, color);
                // Check the square is not occupied
                if (!position.isSquareOccupied(doubleForwardSquare)) {
                    moves.push(createMove(square, doubleForwardSquare));
                }
            }
        }
    }
    // Pawns capture forward and to the left or right
    const captureSquares = [getLeftSquare(forwardSquare), getRightSquare(forwardSquare)];
    for (const capSquare of captureSquares) {
        if (capSquare !== SQUARES.INVALID) {
            // Can only move if there is a piece on the capture square or the capture square is the enpassant square
            const pieceOnSquare = position.getPieceOnSquare(capSquare);
            if ((pieceOnSquare && pieceOnSquare.color !== color) || capSquare === position.enpassantSquare) {
                if (isPromotion) {
                    for (const promotion of PROMOTION_PIECE_TYPES) {
                        moves.push(createMove(square, capSquare, promotion));
                    }
                } else {
                    moves.push(createMove(square, capSquare));
                }
            }
        }
    }
    return moves;
}

// Utility function that generates "non-sliding" moves from a set of vectors (eg. Knight and king)
function generateMovesFromNonSlidingVectors(square, color, position, vectors) {
    const file = fileOfSquare(square);
    const rank = rankOfSquare(square);
    const moves = [];
    for (const vector of vectors) {
        const newFile = file + vector[0];
        const newRank = rank + vector[1];
        if (validFileAndRank(newFile, newRank)) {
            const newSquare = createSquare(newFile, newRank);
            const pieceOnSquare = position.getPieceOnSquare(newSquare);
            if (!pieceOnSquare || pieceOnSquare.color !== color) {
                moves.push(createMove(square, newSquare));
            }
        }
    }
    return moves;
}

// Utility function that generates "sliding" moves by traversing along a set of vectors until a piece is reached or the edge of the board
function generateMovesFromSlidingVectors(square, color, position, vectors) {
    const file = fileOfSquare(square);
    const rank = rankOfSquare(square);
    const moves = [];
    for (const vector of vectors) {
        let currentFile = file + vector[0];
        let currentRank = rank + vector[1];
        while (validFileAndRank(currentFile, currentRank)) {
            const pieceOnSquare = position.getPieceOnSquare(createSquare(currentFile, currentRank));
            if (!pieceOnSquare || pieceOnSquare.color !== color) {
                moves.push(createMove(square, createSquare(currentFile, currentRank)));
                // Stop expanding along this vector (we can't x-ray through pieces)
                if (Boolean(pieceOnSquare)) {
                    break;
                }
            } else {
                break;
            }
            currentFile += vector[0];
            currentRank += vector[1];
        }
    }
    return moves;
}

// Generates all pseudo-legal knight moves from a given square
function generateKnightMoves(square, color, position) {
    return generateMovesFromNonSlidingVectors(square, color, position, KNIGHT_MOVE_VECTORS);
}

// Generates all pseudo-legal bishop moves from a given square
function generateBishopMoves(square, color, position) {
    return generateMovesFromSlidingVectors(square, color, position, BISHOP_MOVE_VECTORS);
}

// Generates all pseudo-legal rook moves from a given square
function generateRookMoves(square, color, position) {
    return generateMovesFromSlidingVectors(square, color, position, ROOK_MOVE_VECTORS);
}

// Generates all pseudo-legal queen moves from a given square
function generateQueenMoves(square, color, position) {
    // A queen is essentially a bishop and rook
    return [...generateBishopMoves(square, color, position), ...generateRookMoves(square, color, position)];
}

// Generates all pseudo-legal king moves from a given square
function generateKingMoves(square, color, position) {
    const moves = generateMovesFromNonSlidingVectors(square, color, position, KING_MOVE_VECTORS);
    // TODO: Castling moves
    if (position.canCastleKingside(color)) {

    }
    if (position.canCastleQueenside(color)) {

    }
    return moves;
}

// Generates all pseudo-legal moves of a given piece on a given square
function generateMoves(piece, square, color, position) {
    switch (piece) {
        case PIECES.PAWN:
            return generatePawnMoves(square, color, position);
        case PIECES.KNIGHT:
            return generateKnightMoves(square, color, position);
        case PIECES.BISHOP:
            return generateBishopMoves(square, color, position);
        case PIECES.ROOK:
            return generateRookMoves(square, color, position);
        case PIECES.QUEEN:
            return generateQueenMoves(square, color, position);
        case PIECES.KING:
            return generateKingMoves(square, color, position);
    }
    throw new Error("Invalid piece type");
}

// Generates all pseudo-legal moves for the given position
function generatePseudoLegalMoves(position) {
    const moves = [];
    for (let i = 0; i < SQUARE_COUNT; i++) {
        const piece = position.getPieceOnSquare(i);
        if (piece && piece.color === position.colorToMove) {
            moves.push(...generateMoves(piece.piece, i, piece.color, position));
        }
    }
    return moves;
}
