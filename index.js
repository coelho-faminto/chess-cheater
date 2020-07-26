const { spawn } = require('child_process')
const express = require('express')
const bodyParser = require('body-parser')

const engine_path = './bin/engines/stockfish/stockfish_20011801_x64'
const port = 3666
const engineArray = []

let lastRes = null
let lastReq = null
let fullData = ''
let goCmd = false

main()

function main() {
    //const engine = spawn(engine_path)
    const server = express()

    server.use(function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
        next()
    })

    server.use(bodyParser.json())

    server.get('/', (req, res) => {
        res.send('ok')
    })
    server.post('/cmd', (req, res) => {
        if (
            (typeof req.body.content == 'undefined') ||
            (typeof req.body.uid == 'undefined')
        ) {
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

        if (!engineExists(req.body.uid)) {
            const arrLen = engineArray.push({
                uid: req.body.uid,
                engine: spawn(engine_path)
            })
        }

        const iEngine = engineExists(req.body.uid)

        if (iEngine !== false) {
            engineArray[iEngine].engine.stdout.setEncoding('utf8');
            engineArray[iEngine].engine.stdout.on('data', data => OnEngineData(engineArray[iEngine].engine, data))
            OnServerCmd(res, engineArray[iEngine].engine, req.body.content)
        }
        else {
            console.log('Could not create new engine')
        }
    })

    server.listen(port)

    console.log('Server started');
}

function engineExists(uid) {
    if (engineArray.length <= 0) {
        return false
    }

    let result = false

    engineArray.forEach((v, index) => {
        if (v.uid == uid) {
            result = index
        }
    })

    return result
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