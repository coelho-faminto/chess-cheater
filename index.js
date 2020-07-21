const { spawn } = require('child_process')
const express = require('express')
const bodyParser = require('body-parser')

const engine_path = './bin/engines/stockfish/stockfish_20011801_x64'
const port = 3666

main()

function main() {
    const engine = spawn(engine_path)
    const server = express()

    engine.stdout.setEncoding('utf8');
    engine.stdout.on('data', data => OnEngineData(engine, data))

    server.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*")
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        next()
    })

    server.use(bodyParser.json())

    server.get('/', (req, res) => {
        res.send('ok')
    })
    server.post('/cmd', (req, res) => {
        if (typeof req.body.content == 'undefined') {
            console.log(req.body)
            res.send('Insuficient parameters')
            return
        }

        OnServerCmd(res, engine, req.body.content)

        res.send('ok')
    })

    server.listen(port)

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