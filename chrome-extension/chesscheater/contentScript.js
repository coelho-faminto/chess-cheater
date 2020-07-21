//contentScript.js

function ajaxSendPost(url, data, done, error = null) {
    try {
        const request = new XMLHttpRequest();

        request.addEventListener('load', done);
        request.addEventListener('error', error);

        request.open('POST', url);
        request.send(data);
    } catch (e) {
        console.log(e);
    }
}

console.log("Hello from chrome extension...");

function drawMove(move, color) {
    //console.log(move);

    if (typeof move != 'string') {
        return;
    }

    if (move.length != 4) {
        return;
    }

    const board = document.querySelector('.board');

    if (!board) {
        return;
    }

    const boardWidth = parseInt(window.getComputedStyle(
        board,
        null
    ).getPropertyValue("width"));

    const boardHeight = parseInt(window.getComputedStyle(
        board,
        null
    ).getPropertyValue("height"));

    move = move.replace(/a/g, '1');
    move = move.replace(/b/g, '2');
    move = move.replace(/c/g, '3');
    move = move.replace(/d/g, '4');
    move = move.replace(/e/g, '5');
    move = move.replace(/f/g, '6');
    move = move.replace(/g/g, '7');
    move = move.replace(/h/g, '8');

    const firstMove_column = move.substr(0, 1);
    const firstMove_rank = move.substr(1, 1);

    const secondMove_column = move.substr(2, 1);
    const secondMove_rank = move.substr(3, 1);

    const squareWidth = boardWidth / 8;
    const squareHeight = boardHeight / 8;

    const oldElements = document.querySelectorAll(`.squareElement-${color}`);

    oldElements.forEach(v => {
        v.remove();
    });

    const firstSquare = document.createElement('div');

    firstSquare.classList.add(`squareElement-${color}`);
    firstSquare.style.width = `${squareWidth}px`;
    firstSquare.style.height = `${squareHeight}px`;

    firstSquare.style.backgroundColor = `#0f07`;

    if (color == 'black') {
        firstSquare.style.backgroundColor = `#f007`;
    }

    firstSquare.style.position = `absolute`;

    const secondSquare = firstSquare.cloneNode(true);

    const firstSquareTop = squareHeight * (8 - firstMove_rank);
    const firstSquareLeft = squareWidth * (firstMove_column - 1);

    const secondSquareTop = squareHeight * (8 - secondMove_rank);
    const secondSquareLeft = squareWidth * (secondMove_column - 1);

    firstSquare.style.top = `${firstSquareTop}px`;
    firstSquare.style.left = `${firstSquareLeft}px`;
    secondSquare.style.top = `${secondSquareTop}px`;
    secondSquare.style.left = `${secondSquareLeft}px`;

    board.appendChild(firstSquare);
    board.appendChild(secondSquare);
}

function extractMove(tag, moves) {
    const groups = moves.match(`${tag}\\[([^\\]]+)\\]`);
    if (!groups) {
        return '';
    }
    if (groups.length != 2) {
        return 'error';
    }

    return groups[1];
}

function drawBestMoves(moves) {
    const whiteMove = extractMove('whiteMove', moves);
    const blackMove = extractMove('blackMove', moves);

    if (whiteMove) {
        //console.log('drawMove(whiteMove)');
        drawMove(whiteMove, 'white');
    }
    if (blackMove) {
        //console.log('drawMove(blackMove)');
        drawMove(blackMove, 'black');
    }
}

const processPieces = paramValue => {
    try {
        ajaxSendPost(
            'http://localhost:5000/script.js',
            paramValue,
            e => {
                //console.log(e.currentTarget.response);
                drawBestMoves(e.currentTarget.response);
                go();
            }
        );
    }
    catch (e) {
        go();
    }
}

function pgnToFen(pgn) {
    var scriptContent = `
if (typeof JCE != 'undefined') {
	window.postMessage({
		type: "JCE-pgnToFen",
		text: JCE.pgnToFen('${pgn}', -1)
	}, "*");
}
		`;

    var script = document.createElement('script');
    script.id = 'tmpScript';
    script.appendChild(document.createTextNode(scriptContent));
    (document.body || document.head || document.documentElement).appendChild(
        script
    );

    document.getElementById("tmpScript").remove();
}

var bWorking = false;
var lastFEN = '';

const sendCmd = (cmd, isPosition = true) => {
    fetch('http://localhost:3666/cmd', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            content: cmd,
            index: 0
        })
    }).then(response => response.json()).then(data => {
        if (
            (typeof data.response == 'undefined') ||
            (typeof data.request == 'undefined')
        ) {
            console.log('Invalid response from API')
            return
        }

        console.log(data.request)
        console.log(data.response)

        if (isPosition) {
            console.log('received response from position cmd')
        }
        else {
            onMoveResponse(data.response)
        }

        bWorking = false
    }).catch((error) => {
        console.log('Error')
        console.log(error)
    })

    if (isPosition) {
        setTimeout(() => { sendCmd('go depth 8', false) }, 22)
    }
}

const onMoveResponse = (response) => {
    if (!response) {
        return
    }

    const regex = new RegExp(/bestmove ([a-z][0-9][a-z][0-9])(?: ponder ([a-z][0-9][a-z][0-9]))?/)
    const match = response.match(regex)
    if (!match) {
        return
    }

    console.log(match)

    switch (match.length) {
        case 3:
            console.log(`ponder: ${match[2]}`)
            drawMove(match[2], 'black');
        case 2:
            console.log(`bestmove: ${match[1]}`)
            drawMove(match[1], 'white');
            break
        default:
            console.log('onResponse: Unknown best move format')
    }
}

const processFen = paramValue => {
    if (bWorking) {
        return;
    }

    bWorking = true;

    sendCmd(`position fen ${paramValue}`)
}

window.addEventListener("message", function (event) {
    // We only accept messages from ourselves
    if (event.source != window) {
        return;
    }

    if (event.data.type && (event.data.type == "JCE-pgnToFen")) {
        if (!event.data.text) {
            return;
        }
        //console.log("Content script received: " + event.data.text);
        if (event.data.text != lastFEN) {
            console.log(`Different FEN: ${event.data.text}`)
            lastFEN = event.data.text
            processFen(event.data.text);
        }
    }
}, false);

var chessC_running = false;

const lookForPieces = () => {
    if (chessC_running) {
        setTimeout(lookForPieces, 250);
        return;
    }

    chessC_running = true;

    try {
        const movesContainer = document.querySelector(
            '.vertical-move-list-component'
        );

        if (!movesContainer) {
            throw 'No moves found';
        }

        const movesNode = document.querySelectorAll(
            '.vertical-move-list-notation-vertical'
        );

        if (!movesNode) {
            throw 'No moves found';
        }

        const arrMoves = new Array();

        movesNode.forEach(v => {
            const innerText = v.innerText.replace(/\n+/g, ' ');
            const words = innerText.split(' ', 3);

            arrMoves.push(words.join(' '));
        });

        const pgn = arrMoves.join(' ')
        //console.log(pgn);

        pgnToFen(pgn);

        go();
    } catch (e) {
        //console.log(e);
        go();
    }
    finally {
        //setTimeout(lookForPieces, 666);
        chessC_running = false;
    }
}

const lookForPieces_backup = () => {
    try {
        const piecesContainer = document.querySelector('.pieces');

        if (!piecesContainer) {
            throw 'No pieces found';
        }

        const pieces = document.querySelectorAll('.pieces .piece');

        if (!pieces.length) {
            throw 'Weird, the pieces container has no pieces';
        }

        processPieces(piecesContainer.innerHTML);
    } catch (e) {
        //console.log(e);
        go();
    }
    finally {
        //setTimeout(lookForPieces, 666);
    }
}

const go = () => {
    setTimeout(lookForPieces, 1);
}

go();