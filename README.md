# Simple Node.js Static Server

Start the server:

```
npm install
npm start
```

Open http://localhost:3000

## AI chat

The chat uses Groq for open-ended questions and keeps the API key on the server.
Create a `.env` file in the project root and add your key:

```env
GROQ_API_KEY=your-groq-key
```

Keep the variable name exactly as shown, with no quotes around the name and no
extra text before it. The server loads this file before reading
`process.env.GROQ_API_KEY`.

The `.env` file is ignored by Git. You can also set `GROQ_API_KEY` directly
in your environment before starting the server:

PowerShell:

```powershell
$env:GROQ_API_KEY = 'your-groq-key'
npm start
```

The default model is the currently available `groq/compound-mini` general-purpose
chat model. You can override it with `GROQ_MODEL` if needed. Configure
`GROQ_API_KEY` in Render's service environment variables before deploying;
never commit your `.env` file.
