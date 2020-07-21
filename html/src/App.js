import React, { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import './App.css'

function App() {
    const [command, setCommand] = useState('')
    const [cmdHistory, setCmdHistory] = useState([])

    const onSubmit = (event) => {
        const _cmdHistory = [...cmdHistory, command]
        
        setCmdHistory(_cmdHistory)
        
        console.log(command)
        console.log(cmdHistory)

        fetch('http://localhost:3666/cmd', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: command
            })
        })

        event.target.reset()

        event.preventDefault()
    }

    const onCommandChange = (event) => {
        setCommand(event.target.value)
    }

    return (
        <div className="App">
            <form method="post" onSubmit={onSubmit}>
                <input type="text" placeholder="command" onChange={onCommandChange}></input>
            </form>
            <ul>
                {cmdHistory.map(v => {
                    return (
                        <li key={uuidv4()}>
                            {v}
                        </li>
                    )
                })}
            </ul>
        </div>
    );
}

export default App;
