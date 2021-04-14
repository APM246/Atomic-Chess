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

function squareColor(square)
{
    return (fileOfSquare(square) + rankOfSquare(square)) % 2 === 0 ? COLORS.BLACK : COLORS.WHITE;
}

// Returns the square directly in front of the given square with respect to the color
// eg. getForwardSquare(SQUARES.A2, COLORS.WHITE) === SQUARES.A3
//     getForwardSquare(SQUARES.A2, COLORS.BLACK) === SQUARES.A1
function getForwardSquare(square, color) {
    assert(square !== SQUARES.INVALID, "Invalid square");
    assert((color === COLORS.WHITE || rankOfSquare(square) !== RANKS.RANK_1) && (color === COLORS.BLACK || rankOfSquare(square) !== RANKS.RANK_8), "Invalid rank");
    return square + (color === COLORS.WHITE ? FILE_COUNT : -FILE_COUNT);
}

function getBackwardSquare(square, color) {
    return getForwardSquare(square, otherColor(color));
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

// Returns true if the squares are touching each other (includes diagonally)
function isNextToSquare(square0, square1) {
    const df = fileOfSquare(square0) - fileOfSquare(square1);
    const dr = rankOfSquare(square0) - rankOfSquare(square1);
    return Math.abs(df) <= 1 && Math.abs(dr) <= 1;
}

function otherColor(color) {
    return color === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK;
}

// Utility function to create a move from 2 squares
function createMove(fromSquare, toSquare, promotion = PIECES.NONE) {
    assert(fromSquare !== toSquare, "Invalid move");
    assert(fromSquare !== SQUARES.INVALID && toSquare !== SQUARES.INVALID, "Invalid from or to square");
    return {
        from: fromSquare,
        to: toSquare,
        promotion,
    };
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
    const isPromotion = toRank === promotionRank;
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

    const rank = rankOfSquare(square);
    if (position.canCastleKingside(color)) {
        const isEmptyPath = [createSquare(FILES.FILE_F, rank), createSquare(FILES.FILE_G, rank)].every(square => !position.isSquareOccupied(square));
        if (isEmptyPath) {
            moves.push(createMove(square, createSquare(FILES.FILE_G, rank)));
        }
    }
    if (position.canCastleQueenside(color)) {
        const isEmptyPath = [createSquare(FILES.FILE_B, rank), createSquare(FILES.FILE_C, rank), createSquare(FILES.FILE_D, rank)].every(square => !position.isSquareOccupied(square));
        if (isEmptyPath) {
            moves.push(createMove(square, createSquare(FILES.FILE_C, rank)));
        }
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

// Convert square to UCI string
function squareToString(square) {
    const file = fileOfSquare(square);
    const rank = rankOfSquare(square);
    return String.fromCharCode("a".charCodeAt(0) + file, "1".charCodeAt(0) + rank);
}

// Create square from UCI string (eg. e4)
function squareFromString(str) {
    const file = str[0];
    const rank = str[1];
    return createSquare(file.charCodeAt(0) - "a".charCodeAt(0), rank.charCodeAt(0) - "1".charCodeAt(0));
}

// Converts piece type to the UCI promotion character
function pieceToString(piece) {
    switch (piece) {
        case PIECES.KNIGHT:
            return "n";
        case PIECES.BISHOP:
            return "b";
        case PIECES.ROOK:
            return "r";
        case PIECES.QUEEN:
            return "q";
    }
    return "";
}

function pieceFromString(str) {
    switch (str) {
        case "n":
            return PIECES.KNIGHT;
        case "b":
            return PIECES.BISHOP;
        case "r":
            return PIECES.ROOK;
        case "q":
            return PIECES.QUEEN;
    }
    return PIECES.NONE;
}

// Converts a move into a UCI string
function moveToString(move) {
    return squareToString(move.from) + squareToString(move.to) + (move.promotion !== PIECES.NONE ? pieceToString(move.promotion) : "");
}

// Converts a UCI string into a move (eg. e2e4, c2c1q)
function moveFromString(str) {
    if (str.length >= 4) {
        const from = squareFromString(str.substr(0, 2));
        const to = squareFromString(str.substr(2, 2));
        let promotion = PIECES.NONE;
        if (str.length === 5) {
            promotion = pieceFromString(str[4]);
        }
        return createMove(from, to, promotion);
    }
    return null;
}

// Perft is a function to test move generation, applyMove and undoMove
// Given a position and depth it recursively applied all possible moves and returns the total number of moves
// Compare with known results from https://www.chessprogramming.org/Perft_Results
function perft(position, depth, log = false, comparisonData = null) {
    const moveData = {};
    const comparison = {};
    if (comparisonData) {
        const lines = comparisonData.split("\n");
        for (const line of lines) {
            const parts = line.split(":")
            comparison[parts[0]] = Number(parts.slice(1));
        }
    }
    const internalPerft = (dpth) => {
        if (dpth <= 0) {
            return 1;
        }
        const moves = generatePseudoLegalMoves(position).filter(mv => position.isLegal(mv));
        if (dpth <= 1 && depth !== 1) {
            return moves.length;
        }
        let count = 0;
        for (const move of moves) {
            const undo = position.applyMove(move, false, false);
            const c = internalPerft(dpth - 1);
            count += c;
            position.undoMove(move, undo, false, false);
            if (dpth === depth) {
                moveData[moveToString(move)] = c;
            }
        }
        return count;
    };
    const total = internalPerft(depth);
    if (log) {
        for (const key of Object.keys(moveData)) {
            console.log(`${key}: ${moveData[key]}`);
            if (Object.keys(comparison).length > 0) {
                if (comparison[key] !== moveData[key]) {
                    console.warn(`${key} ERROR ${moveData[key]} !== ${comparison[key]}`);
                }
            }
        }
        console.log(total);
    }
    return total;
}
