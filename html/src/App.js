import React, { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import './App.css'

function App() {
    const [command, setCommand] = useState('')
    const [cmdHistory, setCmdHistory] = useState([])

    const sendCmd = (cmd) => {
        const _cmdHistory = [...cmdHistory, {
            command: cmd,
            response: ''
        }]

        setCmdHistory(_cmdHistory)

        fetch('http://localhost:3666/cmd', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: cmd,
                index: _cmdHistory.length - 1
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

            onResponse(data.response)

            if (typeof data.request.index == 'undefined') {
                console.log('Invalid request response from API')
                return
            }

            const __cmdHistory = [..._cmdHistory]

            __cmdHistory[data.request.index].response = data.response
            setCmdHistory(__cmdHistory)
        }).catch((error) => {
            console.log('Error')
            console.log(error)
        })
    }

    const onResponse = (response) => {
        const regex = new RegExp(/bestmove ([a-z][0-9][a-z][0-9])(?: ponder ([a-z][0-9][a-z][0-9]))?/)
        const match = response.match(regex)
        if (!match) {
            return
        }

        console.log(match)

        switch (match.length) {
            case 3:
                console.log(`ponder: ${match[2]}`)
            case 2:
                console.log(`bestmove: ${match[1]}`)
                break
            default:
                console.log('onResponse: Unknown best move format')
        }
    }

    const onSubmit = (event) => {
        console.log(command)

        sendCmd(command)

        event.target.reset()

        event.preventDefault()
    }

    const onCommandChange = (event) => {
        setCommand(event.target.value)
    }

    const onClickHistory = (event) => {
        const index = event.target.getAttribute('data-index')

        if (index === '') {
            return
        }

        console.log(cmdHistory[parseInt(index)].command)
    }

    return (
        <div className="App">
            <form method="post" onSubmit={onSubmit}>
                <input type="text" placeholder="command" onChange={onCommandChange}></input>
            </form>
            <ul>
                {cmdHistory.map((v, index) => {
                    return (
                        <li key={uuidv4()}>
                            <button data-index={index} onClick={onClickHistory}>
                                {index + 1}. {v.command} -&gt; {v.response}
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    );
}

export default App;
