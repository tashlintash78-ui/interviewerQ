# InterviewIQ - AI Interview Simulator

A professional AI-powered interview simulator built with React, Tailwind CSS, and the Google Gemini API.

## Features
- **Tailored Mock Interviews**: Role-specific practice (Behavioral, Technical, Case).
- **CV Analysis**: Context-aware interviewing based on your resume.
- **Dual Input Mode**: Switch between Voice and Text responses.
- **Live Coaching**: Immediate counselling-style feedback after every answer.
- **Interactive Avatar**: A reactive AI interviewer with lifelike animations.

## Deployment Instructions

### 1. Get a Gemini API Key
- Go to [Google AI Studio](https://aistudio.google.com/).
- Create a new API Key.

### 2. Set Up Environment Variables
When deploying to platforms like **Vercel**, **Netlify**, or **GitHub Pages**, you must configure your API key.

#### For Vercel/Netlify:
Add an environment variable in your project settings:
- **Key**: `VITE_GEMINI_API_KEY`
- **Value**: `your_api_key_here`

#### For Local Development:
Create a `.env` file in the root directory:
```env
VITE_GEMINI_API_KEY=your_api_key_here
```

### 3. Build and Deploy
```bash
npm install
npm run build
```
The static files will be generated in the `dist/` folder.

## GitHub Pages Note
If you are deploying to GitHub Pages at a sub-path (e.g., `https://username.github.io/repo-name/`), you may need to update the `base` property in `vite.config.ts`.

```typescript
// vite.config.ts
export default defineConfig({
  base: '/repo-name/',
  // ... rest of config
})
```

## License
MIT
