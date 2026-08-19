# Simple Node.js Static Server

Start the server:

```
npm install
npm start
```

Open http://localhost:3000

## AI chat

The chat uses Groq for open-ended questions and keeps the API key on the server.
Set `GROQ_API_KEY` in your environment before starting the server:

PowerShell:

```powershell
$env:GROQ_API_KEY = 'your-groq-key'
npm start
```

The default model is `llama-3.3-70b-versatile`. Configure the same
`GROQ_API_KEY` environment variable in Render's service settings before deploying.
