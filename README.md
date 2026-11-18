# StudyMate AI - AI-Powered Personalized Learning Workspace

StudyMate AI is an intelligent learning platform that helps students understand study materials, evaluate their knowledge, identify learning gaps, and create personalized revision plans using Generative AI.

Students can upload PDF study materials and interact with an AI-powered study assistant that generates answers, quizzes, topic maps, and learning recommendations based on uploaded content.

## Key Features

1. **PDF Upload and Processing**
   - Upload PDF study materials.
   - Extract and process document text.
   - Split content into smaller overlapping chunks.
   - Generate embeddings for semantic search.

2. **AI Topic Mapping**
   - Identify important topics from study materials.
   - Generate topic descriptions.
   - Save mapped topics.

3. **Diagnostic Quiz**
   - Generate multiple-choice questions.
   - Submit answers and receive scores.
   - View correct answers and explanations.

4. **Quiz Evaluation**
   - Automatically evaluate student answers.
   - Calculate quiz scores.
   - Store quiz attempts and responses.

5. **Topic Performance Tracking**
   - Track topic-wise performance.
   - Monitor attempts and scores.
   - Measure learning progress.

6. **Learning Gap Analysis**
   - Analyze quiz performance.
   - Identify strong and weak learning areas.
   - Generate improvement recommendations.

7. **Personalized Revision Plan**
   - Generate revision activities.
   - Allocate study time.
   - Provide AI-generated study recommendations.

8. **AI Study Assistant**
   - Ask questions about uploaded materials.
   - Retrieve relevant information using semantic search.
   - Generate answers with source references.

9. **My Progress Dashboard**
   - View total quiz attempts.
   - Monitor average scores.
   - Track topic performance.
   - Review recent quiz results.

10. **User Authentication**
    - User registration and login.
    - Supabase authentication.
    - User-specific learning data.

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Generative AI | Google Gemini API |
| Embeddings | Gemini Embedding Model |
| PDF Processing | unpdf |
| Semantic Search | Vector Search, Supabase RPC |
| Tools | Node.js, npm, Git, GitHub |

## Project Architecture

1. Students upload PDF learning materials.
2. The application extracts document text.
3. Text is divided into overlapping chunks.
4. Gemini generates vector embeddings.
5. Embeddings are stored in Supabase.
6. Relevant content is retrieved using semantic similarity.
7. Gemini generates topic maps, quizzes, explanations, and learning recommendations.
8. Student performance is stored and displayed on the dashboard.

## Getting Started

### Prerequisites

- Node.js
- npm
- Supabase account
- Google AI Studio API key

### 1. Clone the Repository

```bash
git clone https://github.com/snehitha-veluguri/studymate-ai.git
cd studymate-ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root.

Add your own credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
GEMINI_API_KEY=your_gemini_api_key
```

Never upload actual API keys or private credentials to GitHub.

### 4. Configure Supabase

Configure the required PostgreSQL tables, Row Level Security policies, vector extension, matching RPC function, and private Storage bucket.

### 5. Start the Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Production Build

```bash
npm run build
```

## GitHub Repository

https://github.com/snehitha-veluguri/studymate-ai

## Project Information

- **Project Name:** StudyMate AI
- **Project Type:** AI-Powered Personalized Learning Platform
- **Domain:** Artificial Intelligence, Generative AI, and Education Technology
- **Developer:** Veluguri Lakshmi Snehitha

---

StudyMate AI - Making learning smarter, more personalized, and more effective with Artificial Intelligence.
