const { spawn } = require('child_process')
const express = require('express');

const engine_path = './bin/engines/stockfish/stockfish_20011801_x64'

main()

function main() {
    const engine = spawn(engine_path)
    const server = express()

    engine.stdout.setEncoding('utf8');
    engine.stdout.on('data', data => OnEngineData(engine, data))

    sendCmd(engine, 'isready')

    server.get('/', (req, res) => {
        if (typeof req.query.cmd == 'undefined') {
            console.log(req.query.cmd)
            res.send('Insuficient parameters')
            return
        }

        OnServerCmd(res, engine, req.query.cmd)

        res.send('ok')
    }).listen(8080);

    console.log('Server started');
}

function sendCmd(engine, cmd) {
    console.log(cmd)
    engine.stdin.write(`${cmd}\n`)
}

function OnEngineData(engine, data) {
    console.log(data)
}

function OnServerCmd(res, engine, cmd) {
    console.log(`Server received cmd: ${cmd}`)
    sendCmd(engine, cmd)
}