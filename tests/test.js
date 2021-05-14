const vm = require("vm");
const fs = require("fs");
const mocha = require("mocha");
const expect = require("chai").expect;
const https = require("https");
const lint = require("mocha-eslint");

function validateCSS(source) {
    let promiseResolve = null;
    const options = {
        host: "validator.w3.org",
        path: "/nu/",
        method: "POST",
        headers: {
            "Content-Type": "text/css",
            "User-Agent": "Mozilla/5.0",
        }
    };

    const request = https.request(options, (response) => {
        let data = "";
        response.on("data", (chunk) => {
            data += chunk;
        });
        response.on("end", () => {
            const errors = data.indexOf("There were errors") >= 0;
            promiseResolve(!errors);
        });
    });
    request.write(source);
    request.end();
    const promise = new Promise((resolve, reject) => {
        promiseResolve = resolve;
    })
    return promise;
}

function validateJS(contextName, sources, tempFilename, tempFiles) {
    let source = "";
    for (const src of sources) {
        source += src;
    }
    fs.writeFileSync(tempFilename, source);
    const options = {
        contextName,
        alwaysWarn: false,
        timeout: 10000,
    };
    lint([tempFilename], options);
    tempFiles.push(tempFilename);
}

function validateJSFiles(contextName, filenames, tempFilename, tempFiles) {
    const sources = filenames.map(filename => fs.readFileSync(filename));
    validateJS(contextName, sources, tempFilename, tempFiles);
}

mocha.describe("JS Validation", function() {
    const tempFiles = [];
    validateJSFiles("Chess Library", [
        "../app/static/chess/utils.js",
        "../app/static/chess/chess.js",
        "../app/static/chess/board.js",
        "../app/static/chess/puzzle.js",
    ], "ChessUtils.js", tempFiles);
    validateJSFiles("Ajax", ["../app/static/ajax.js"], "ajax.js", tempFiles);
    validateJSFiles("Forms", ["../app/static/forms.js"], "forms.js", tempFiles);
    validateJSFiles("Learn Utils", ["../app/static/ajax.js", "../app/static/learn/utils.js"], "learnutils.js", tempFiles);
    validateJSFiles("Learn Init", ["../app/static/learn/initialize.js"], "initialize.js", tempFiles);

    // Cleanup temporary files
    after(() => {
        for (const file of tempFiles) {
            fs.unlinkSync(file);
        }
    })
});

mocha.describe("CSS Validation", function() {
    this.timeout(120000);
    it("base.css", async function() {
        const source = fs.readFileSync("../app/static/base.css");
        const result = await validateCSS(source);
        expect(result).to.equal(true);
    });
    it("globals.css", async function() {
        const source = fs.readFileSync("../app/static/globals.css");
        const result = await validateCSS(source);
        expect(result).to.equal(true);
    });
    it("learn/lesson_outline.css", async function() {
        const source = fs.readFileSync("../app/static/learn/lesson_outline.css");
        const result = await validateCSS(source);
        expect(result).to.equal(true);
    });
    it("learn/progress_bar.css", async function() {
        const source = fs.readFileSync("../app/static/learn/progress_bar.css");
        const result = await validateCSS(source);
        expect(result).to.equal(true);
    });
    it("chess/chess.css", async function() {
        const source = fs.readFileSync("../app/static/chess/chess.css");
        const result = await validateCSS(source);
        expect(result).to.equal(true);
    });
});

function importScript(filename) {
    const data = fs.readFileSync(filename);
    vm.runInThisContext(data);
}

importScript("../app/static/chess/utils.js");
importScript("../app/static/chess/chess.js");
importScript("../app/static/chess/board.js");

mocha.describe("Chess Position", function() {
    mocha.describe("Get Result", function() {
        const position = new Position();
        position.isAtomic = false;

        it("Black checkmate", function() {
            position.setFromFen("rnb1kbnr/pppp1ppp/4p3/8/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3");
            position.isAtomic = false;
            expect(position.getResult()).to.equal(POSITION_STATE.BLACK_WIN);
        });

        it("Black 1 move from checkmate", function() {
            position.setFromFen("rnbqkbnr/pppp1ppp/4p3/8/5PP1/8/PPPPP2P/RNBQKBNR b KQkq g3 0 2");
            position.isAtomic = false;
            expect(position.getResult()).to.equal(POSITION_STATE.VALID);
        });

        it("White checkmate", function() {
            position.setFromFen("r1bqkbnr/ppp2Qpp/2np4/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4");
            position.isAtomic = false;
            expect(position.getResult()).to.equal(POSITION_STATE.WHITE_WIN);
        });

        it("White 1 move from checkmate", function() {
            position.setFromFen("r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4");
            position.isAtomic = false;
            expect(position.getResult()).to.equal(POSITION_STATE.VALID);
        });

        it("Stalemate", function() {
            position.setFromFen("4k3/8/8/7b/8/6q1/8/7K w - - 4 3");
            position.isAtomic = false;
            expect(position.getResult()).to.equal(POSITION_STATE.DRAW);
        });

        it("Draw by insufficient material", function() {
            position.setFromFen("8/3k4/8/4K3/8/8/8/8 w - - 1 2");
            position.isAtomic = false;
            expect(position.getResult()).to.equal(POSITION_STATE.DRAW);
        });

        it("Opening position", function() {
            position.setFromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
            position.isAtomic = false;
            expect(position.getResult()).to.equal(POSITION_STATE.VALID);
        });

        it("Black king explode", function() {
            position.setFromFen("rnbqkbnr/pppp2pp/5p2/4P3/8/8/PPP1PPPP/RNBQKBNR w KQkq - 0 3");
            position.isAtomic = true;
            // Move queen to explode king
            const move = createMove(SQUARES.D1, SQUARES.D7);
            position.applyMove(move, false, false);
            expect(position.getResult()).to.equal(POSITION_STATE.WHITE_WIN);
        });
    });

    mocha.describe("Classical Move Generation", function() {
        mocha.describe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", function() {
            this.timeout(120000);
            const position = new Position();
            position.isAtomic = false;
            position.setFromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

            it("Depth 1", function() {
                expect(perft(position, 1)).to.equal(20);
            });
            it("Depth 2", function() {
                expect(perft(position, 2)).to.equal(400);
            });
            it("Depth 3", function() {
                expect(perft(position, 3)).to.equal(8902);
            });
            it("Depth 4", function() {
                expect(perft(position, 4)).to.equal(197281);
            });
            it("Depth 5", function() {
                expect(perft(position, 5)).to.equal(4865609);
            });
        });

        mocha.describe("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -", function() {
            this.timeout(120000);
            const position = new Position();
            position.isAtomic = false;
            position.setFromFen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -");

            it("Depth 1", function() {
                expect(perft(position, 1)).to.equal(48);
            });
            it("Depth 2", function() {
                expect(perft(position, 2)).to.equal(2039);
            });
            it("Depth 3", function() {
                expect(perft(position, 3)).to.equal(97862);
            });
            it("Depth 4", function() {
                expect(perft(position, 4)).to.equal(4085603);
            });
        });

        mocha.describe("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -", function() {
            this.timeout(120000);
            const position = new Position();
            position.isAtomic = false;
            position.setFromFen("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -");

            it("Depth 1", function() {
                expect(perft(position, 1)).to.equal(14);
            });
            it("Depth 2", function() {
                expect(perft(position, 2)).to.equal(191);
            });
            it("Depth 3", function() {
                expect(perft(position, 3)).to.equal(2812);
            });
            it("Depth 4", function() {
                expect(perft(position, 4)).to.equal(43238);
            });
            it("Depth 5", function() {
                expect(perft(position, 5)).to.equal(674624);
            });
        });

        mocha.describe("r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", function() {
            this.timeout(120000);
            const position = new Position();
            position.isAtomic = false;
            position.setFromFen("r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1");

            it("Depth 1", function() {
                expect(perft(position, 1)).to.equal(6);
            });
            it("Depth 2", function() {
                expect(perft(position, 2)).to.equal(264);
            });
            it("Depth 3", function() {
                expect(perft(position, 3)).to.equal(9467);
            });
            it("Depth 4", function() {
                expect(perft(position, 4)).to.equal(422333);
            });
        });

        mocha.describe("r2q1rk1/pP1p2pp/Q4n2/bbp1p3/Np6/1B3NBn/pPPP1PPP/R3K2R b KQ - 0 1", function() {
            this.timeout(120000);
            const position = new Position();
            position.isAtomic = false;
            position.setFromFen("r2q1rk1/pP1p2pp/Q4n2/bbp1p3/Np6/1B3NBn/pPPP1PPP/R3K2R b KQ - 0 1");

            it("Depth 1", function() {
                expect(perft(position, 1)).to.equal(6);
            });
            it("Depth 2", function() {
                expect(perft(position, 2)).to.equal(264);
            });
            it("Depth 3", function() {
                expect(perft(position, 3)).to.equal(9467);
            });
            it("Depth 4", function() {
                expect(perft(position, 4)).to.equal(422333);
            });
        });

        mocha.describe("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", function() {
            this.timeout(120000);
            const position = new Position();
            position.isAtomic = false;
            position.setFromFen("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8");

            it("Depth 1", function() {
                expect(perft(position, 1)).to.equal(44);
            });
            it("Depth 2", function() {
                expect(perft(position, 2)).to.equal(1486);
            });
            it("Depth 3", function() {
                expect(perft(position, 3)).to.equal(62379);
            });
            it("Depth 4", function() {
                expect(perft(position, 4)).to.equal(2103487);
            });
        });

        mocha.describe("r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10", function() {
            this.timeout(120000);
            const position = new Position();
            position.isAtomic = false;
            position.setFromFen("r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10");

            it("Depth 1", function() {
                expect(perft(position, 1)).to.equal(46);
            });
            it("Depth 2", function() {
                expect(perft(position, 2)).to.equal(2079);
            });
            it("Depth 3", function() {
                expect(perft(position, 3)).to.equal(89890);
            });
            it("Depth 4", function() {
                expect(perft(position, 4)).to.equal(3894594);
            });
        });
    });

    mocha.describe("Atomic Move Generation", function() {
        mocha.describe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", function() {
            this.timeout(120000);
            const position = new Position();
            position.isAtomic = true;
            position.setFromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");

            it("Depth 1", function() {
                expect(perft(position, 1)).to.equal(20);
            });
            it("Depth 2", function() {
                expect(perft(position, 2)).to.equal(400);
            });
            it("Depth 3", function() {
                expect(perft(position, 3)).to.equal(8902);
            });
            it("Depth 4", function() {
                expect(perft(position, 4)).to.equal(197326);
            });
            it("Depth 5", function() {
                expect(perft(position, 5)).to.equal(4864979);
            });
        });

        mocha.describe("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -", function() {
            this.timeout(120000);
            const position = new Position();
            position.isAtomic = true;
            position.setFromFen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -");

            it("Depth 1", function() {
                expect(perft(position, 1)).to.equal(48);
            });
            it("Depth 2", function() {
                expect(perft(position, 2)).to.equal(1939);
            });
            it("Depth 3", function() {
                expect(perft(position, 3)).to.equal(88298);
            });
            it("Depth 4", function() {
                expect(perft(position, 4)).to.equal(3492097);
            });
        });

        mocha.describe("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -", function() {
            this.timeout(120000);
            const position = new Position();
            position.isAtomic = true;
            position.setFromFen("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -");

            it("Depth 1", function() {
                expect(perft(position, 1)).to.equal(14);
            });
            it("Depth 2", function() {
                expect(perft(position, 2)).to.equal(203);
            });
            it("Depth 3", function() {
                expect(perft(position, 3)).to.equal(2784);
            });
            it("Depth 4", function() {
                expect(perft(position, 4)).to.equal(42280);
            });
            it("Depth 5", function() {
                expect(perft(position, 5)).to.equal(619830);
            });
        });

        mocha.describe("rnb1kbnr/2P5/8/8/8/8/PP1PPPPP/RNBQKBNR w KQkq - 0 1", function() {
            this.timeout(120000);
            const position = new Position();
            position.isAtomic = true;
            position.setFromFen("rnb1kbnr/2P5/8/8/8/8/PP1PPPPP/RNBQKBNR w KQkq - 0 1");

            it("Depth 1", function() {
                expect(perft(position, 1)).to.equal(25);
            });
            it("Depth 2", function() {
                expect(perft(position, 2)).to.equal(775);
            });
            it("Depth 3", function() {
                expect(perft(position, 3)).to.equal(21393);
            });
            it("Depth 4", function() {
                expect(perft(position, 4)).to.equal(654985);
            });
        })
    });
});
