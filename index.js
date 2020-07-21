const { spawn } = require('child_process')
const express = require('express')
const bodyParser = require('body-parser')

const engine_path = './bin/engines/stockfish/stockfish_20011801_x64'
const port = 3666
let lastRes = null
let lastReq = null
let fullData = ''
let goCmd = false

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

        if (lastRes) {
            lastRes.status(200).json({
                response: null,
                request: lastReq
            })
    
            lastRes = null
        }

        lastReq = req.body

        OnServerCmd(res, engine, req.body.content)
    })

    server.listen(port)

    console.log('Server started');
}

function sendCmd(engine, cmd) {
    const cmds = cmd.split(' ')
    if (typeof cmds.length != 'undefined') { 
        if (cmds.length > 0) {
            goCmd = (cmds[0] == 'go')
        }
    }

    console.log(cmd)
    engine.stdin.write(`${cmd}\n`)
}

function OnEngineData(engine, data) {
    let sendData = true

    fullData += data

    if (goCmd) {
        sendData = false

        if (data.includes('bestmove ')) {
            sendData = true
        }
    }

    if (!sendData) {
        return
    }

    sendData = false

    console.log(fullData)

    if (lastRes) {
        lastRes.send(JSON.stringify({
            response: fullData,
            request: lastReq
        }))

        lastRes = null
    }

    fullData = ''
}

function OnServerCmd(res, engine, cmd) {
    lastRes = res

    console.log(`Server received cmd: ${cmd}`)
    sendCmd(engine, cmd)
}