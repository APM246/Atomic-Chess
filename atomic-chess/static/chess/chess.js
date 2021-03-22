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

// Utility function to create a square from a given file and rank
function createSquare(file, rank) {
    return file + (rank * FILE_COUNT);
}

function fileOfSquare(square) {
    return square & 0x7;
}

function rankOfSquare(square) {
    return square >> 3;
}

function otherColor(color) {
    return color === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK;
}

// Generates all pseudo-legal pawn moves from a given square
function generatePawnMoves(square, color) {

}

// Generates all pseudo-legal knight moves from a given square
function generateKnightMoves(square) {

}

// Generates all pseudo-legal bishop moves from a given square
function generateBishopMoves(square, position) {

}

// Generates all pseudo-legal rook moves from a given square
function generateRookMoves(square, position) {

}

// Generates all pseudo-legal queen moves from a given square
function generateQueenMoves(square, position) {

}

// Generates all pseudo-legal king moves from a given square
function generateKingMoves(square) {

}

// Generates all pseudo-legal moves of a given piece on a given square
function generateMoves(piece, square, color, position) {
    switch (piece) {
        case PIECES.PAWN:
            return generatePawnMoves(square, color);
        case PIECES.KNIGHT:
            return generateKnightMoves(square);
        case PIECES.BISHOP:
            return generateBishopMoves(square, position);
        case PIECES.ROOK:
            return generateRookMoves(square, position);
        case PIECE.QUEEN:
            return generateQueenMoves(square, position);
        case PIECE.KING:
            return generateKingMoves(square);
    }
    throw new Error("Invalid piece type");
}
