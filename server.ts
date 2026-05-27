import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sqlite3 from 'sqlite3';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  // Setup SQLite Database connection and Promise wrap helpers
  const dbPath = path.join(process.cwd(), 'database.sqlite');
  const verboseSqlite = sqlite3.verbose();
  const db = new verboseSqlite.Database(dbPath);

  const dbRun = (query: string, params: any[] = []): Promise<{ id: number; changes: number }> => {
    return new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  };

  const dbAll = (query: string, params: any[] = []): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  const dbGet = (query: string, params: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  // Perform SQL Migrations (Sync setup)
  db.serialize(() => {
    // 1. Prompts Blueprint Table
    db.run(`
      CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        system_prompt TEXT NOT NULL,
        variables_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. LLM Sandbox Runs Logging Table
    db.run(`
      CREATE TABLE IF NOT EXISTS sandbox_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        system_prompt TEXT NOT NULL,
        variables_json TEXT,
        user_text TEXT,
        response TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Kaggle CSV Feedback Row replica table for live relational curation
    db.run(`
      CREATE TABLE IF NOT EXISTS kaggle_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT,
        customer_name TEXT,
        product_ordered TEXT,
        ticket_text TEXT,
        urgency_level TEXT,
        dataset TEXT DEFAULT 'general',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, () => {
      // Alter table to add dataset column if it doesn't already exist for backwards compatibility with previous runs
      db.run("ALTER TABLE kaggle_feedback ADD COLUMN dataset TEXT DEFAULT 'general'", () => {
        // Ignored if column already exists
      });

      // Seed table with Kaggle support CSV rows if there are none in the DB
      db.get("SELECT COUNT(*) as count FROM kaggle_feedback WHERE dataset = 'general'", (err, row: any) => {
        if (!err && row && row.count === 0) {
          console.log("[SQLite DB] Initializing kaggle_feedback relational rows from customer_support_feedback.csv");
          const csvPath = path.join(process.cwd(), 'customer_support_feedback.csv');
          if (fs.existsSync(csvPath)) {
            try {
              const csvContent = fs.readFileSync(csvPath, 'utf8');
              const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
              if (lines.length > 1) {
                const headers = lines[0].split(',').map(h => h.trim());
                for (let i = 1; i < lines.length; i++) {
                  const values = lines[i].split(',');
                  const record: Record<string, string> = {};
                  headers.forEach((h, index) => {
                    record[h] = values[index]?.trim() || '';
                  });
                  db.run(
                    `INSERT INTO kaggle_feedback (ticket_id, customer_name, product_ordered, ticket_text, urgency_level, dataset) VALUES (?, ?, ?, ?, ?, 'general')`,
                    [
                      record['ticket_id'] || `${Math.floor(1000 + Math.random() * 9000)}`,
                      record['customer_name'] || 'Unknown Customer',
                      record['product_ordered'] || 'General Product',
                      record['ticket_text'] || '',
                      record['urgency_level'] || 'Medium'
                    ]
                  );
                }
                console.log("[SQLite DB] Seeding of customer_support_feedback records completed successfully.");
              }
            } catch (e) {
              console.error("[SQLite DB Seeding Error]", e);
            }
          }
        }
      });

      // Seed Neon.tech dataset database support records if none exist
      db.get("SELECT COUNT(*) as count FROM kaggle_feedback WHERE dataset = 'neon'", (err, row: any) => {
        if (!err && row && row.count === 0) {
          console.log("[SQLite DB] Initializing Neon.tech database support records");
          const neonTickets = [
            {
              ticket_id: 'NEON-1011',
              customer_name: 'Ethan Vance',
              product_ordered: 'Serverless Postgres',
              ticket_text: 'Getting sporadic "FATAL: connection requires a secure (SSL) connection" error during database connection initialization. Our connection-string has sslmode=require but the server continues to refuse Vercel serverless functions in production.',
              urgency_level: 'High'
            },
            {
              ticket_id: 'NEON-2041',
              customer_name: 'Sarah Jenkins',
              product_ordered: 'Branching API Client',
              ticket_text: 'Our automated CI/CD pipeline tests fail because database branching takes more than 120 seconds to activate. It remains in "initiating_compute" state for too long before yielding the DB connection string.',
              urgency_level: 'Medium'
            },
            {
              ticket_id: 'NEON-3042',
              customer_name: 'Niko Bellic',
              product_ordered: 'Billing Engine',
              ticket_text: 'Our invoice displays extra compute hour charges because a development branch did not automatically scale down to zero when idle. The scaling down is stalled despite lack of query traffic.',
              urgency_level: 'Low'
            },
            {
              ticket_id: 'NEON-4091',
              customer_name: 'Marcus Chen',
              product_ordered: 'Autoscaling Compute',
              ticket_text: 'We configured autoscaling with a limit of 4 CU (Compute Units). However, during concurrent write batch loads, the system gets throttled and experiences lock latencies. Autoscale fails to trigger fast enough.',
              urgency_level: 'High'
            },
            {
              ticket_id: 'NEON-5120',
              customer_name: 'Elena Rostova',
              product_ordered: 'Serverless WebSockets',
              ticket_text: 'The JS/TS serverless driver throws "WebSocket connection failed: Sec-WebSocket-Accept mismatch" under peak database query loads when routed through our connection pooler.',
              urgency_level: 'Medium'
            },
            {
              ticket_id: 'NEON-6031',
              customer_name: 'Vikram Patel',
              product_ordered: 'PITR Recovery Engine',
              ticket_text: 'Point-of-time recovery failed when we attempted to restore our production database to May 26th @ 04:30 AM. CLI returns error "Operation Rejected: Storage snapshot corrupted for LSN epoch 85921". We need urgent restore assist.',
              urgency_level: 'High'
            }
          ];

          for (const ticket of neonTickets) {
            db.run(
              `INSERT INTO kaggle_feedback (ticket_id, customer_name, product_ordered, ticket_text, urgency_level, dataset) VALUES (?, ?, ?, ?, ?, 'neon')`,
              [ticket.ticket_id, ticket.customer_name, ticket.product_ordered, ticket.ticket_text, ticket.urgency_level]
            );
          }
          console.log("[SQLite DB] Seeding of Neon.tech support records completed successfully.");
        }
      });
    });
  });

  // Setup Gemini SDK if API key is present
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API Endpoints
  // 1. Refine the user draft prompt into a highly structured system prompt
  app.post('/api/enhance', async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: 'Gemini API key is not configured. Please add your GEMINI_API_KEY secret.' });
      }
      const { prompt, tone, language } = req.body;
      
      if (!prompt || String(prompt).trim().length === 0) {
        return res.status(400).json({ error: 'Draft prompt cannot be empty.' });
      }

      const systemInstruction = `You are a legendary prompt engineer. Your job is to take a draft prompt and refine it into a highly effective, production-ready structured system prompt for large language models.
      
      CRITICAL INSTRUCTIONS:
      - Add crisp organization and sections, such as "Role", "Primary Mission", "Input Structure / Variables List", "Output Constraints & Schema", and "Few-Shot Examples" (only if beneficial).
      - Ensure all dynamic variables (like {{variableName}}) present in the draft are explicitly kept and documented in the refined prompt structure. Do not change variable names.
      - Refine the instructions for tone: "${tone || 'professional'}".
      - Translate and output the final prompt text in this language: "${language || 'English'}".
      - Output ONLY the robust system prompt in Markdown format. Do not write any greetings, conversational meta-commentary, or introductory remarks like "Sure, here is your enhanced prompt...". Just start immediately with the markdown prompt content.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Draft Prompt:\n\n${prompt}`,
        config: {
          systemInstruction,
          temperature: 0.6,
        }
      });

      res.json({ enhancedPrompt: response.text || 'Failed to generate enhanced prompt.' });
    } catch (error: any) {
      console.error('Enhance API Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to enhance prompt.' });
    }
  });

  // 2. Client-side variable extractor
  app.post('/api/generate-variables', async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: 'Gemini API key is not configured.' });
      }
      const { prompt } = req.body;
      
      if (!prompt || String(prompt).trim().length === 0) {
        return res.json({ variables: [] });
      }

      const systemInstruction = `You are an automated code utility. Your job is to analyze prompt text and extract template placeholders inside double curly braces, e.g., {{variableName}} or {{ topic }}.
      
      CRITICAL INSTRUCTIONS:
      - Extract all unique variables.
      - Strip any whitespaces inside the braces, e.g., {{ topic }} becomes 'topic'.
      - Avoid duplicate variables.
      - If no variables are found, return an empty array.
      - Respond strictly with a JSON object conforming to this schema, without any backticks, markdown markers, or other text:
      {
        "variables": [
          { "name": "variableName", "default": "sample fallback value", "description": "a single phrase explaining what to input" }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Input Text:\n\n${prompt}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        }
      });

      let responseText = response.text || '{"variables":[]}';
      // Clean up markdown markers if any got returned despite instructions
      if (responseText.includes('```')) {
        responseText = responseText.replace(/```[a-z]*\n?/g, '').trim();
      }

      res.json(JSON.parse(responseText));
    } catch (error: any) {
      console.error('Extract Variables Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to extract variables.' });
    }
  });

  // 3. Test/Run Sandbox with Variable Substitutions
  app.post('/api/run', async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: 'Gemini API key is not configured.' });
      }
      const { systemPrompt, variables, userText } = req.body;
      
      if (!systemPrompt || String(systemPrompt).trim().length === 0) {
        return res.status(400).json({ error: 'System prompt cannot be empty.' });
      }

      // Substitute variables in system prompt
      let processedSystemPrompt = systemPrompt;
      if (variables && typeof variables === 'object') {
        for (const [key, val] of Object.entries(variables)) {
          // Replace both standard and whitespace variants like {{key}} and {{ key }}
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          processedSystemPrompt = processedSystemPrompt.replace(regex, String(val));
        }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userText || 'Simulate complete execution with the configured variables and schema instructions.',
        config: {
          systemInstruction: processedSystemPrompt,
          temperature: 0.7,
        }
      });

      const responseText = response.text || 'Empty response.';

      // Automatically store this run in the Relational SQL Database
      try {
        await dbRun(
          `INSERT INTO sandbox_runs (system_prompt, variables_json, user_text, response) VALUES (?, ?, ?, ?)`,
          [systemPrompt, JSON.stringify(variables || {}), userText || '', responseText]
        );
      } catch (dbErr) {
        console.error('[SQLite] Failed to store sandbox run:', dbErr);
      }

      res.json({ result: responseText });
    } catch (error: any) {
      console.error('Run Sandbox Error:', error);
      res.status(500).json({ error: error?.message || 'Execution failed.' });
    }
  });

  // 4. Load local workspace Kaggle Files (IPYNB and CSV)
  app.get('/api/load-local-kaggle', (req, res) => {
    try {
      const ipynbPath = path.join(process.cwd(), 'kaggle_feedback_sentiment.ipynb');
      const csvPath = path.join(process.cwd(), 'customer_support_feedback.csv');
      
      let notebookJSON = null;
      let csvContent = '';

      if (fs.existsSync(ipynbPath)) {
        notebookJSON = JSON.parse(fs.readFileSync(ipynbPath, 'utf8'));
      }
      
      if (fs.existsSync(csvPath)) {
        csvContent = fs.readFileSync(csvPath, 'utf8');
      }

      res.json({
        notebook: notebookJSON,
        csv: csvContent
      });
    } catch (error: any) {
      console.error('Load Kaggle Files Error:', error);
      res.status(500).json({ error: error?.message || 'Failed to load local Kaggle files.' });
    }
  });

  // --- DATABASE SPECIFIC CRUD APIS ---

  // A. Prompts CRUD in SQLite
  app.get('/api/db/prompts', async (req, res) => {
    try {
      const rows = await dbAll("SELECT * FROM prompts ORDER BY created_at DESC");
      res.json({ prompts: rows });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to list prompts.' });
    }
  });

  app.post('/api/db/prompts', async (req, res) => {
    try {
      const { name, system_prompt, variables_json } = req.body;
      if (!name || !system_prompt) {
        return res.status(400).json({ error: 'Name and system prompt are required.' });
      }
      const { id } = await dbRun(
        `INSERT INTO prompts (name, system_prompt, variables_json) VALUES (?, ?, ?)`,
        [name, system_prompt, variables_json || '{}']
      );
      res.json({ success: true, id, message: 'Prompt saved to relational SQL database!' });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to save prompt.' });
    }
  });

  app.delete('/api/db/prompts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await dbRun("DELETE FROM prompts WHERE id = ?", [id]);
      res.json({ success: true, message: 'Prompt deleted from SQL database.' });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to delete prompt.' });
    }
  });

  // B. Sandbox Runs CRUD/History in SQLite
  app.get('/api/db/runs', async (req, res) => {
    try {
      const rows = await dbAll("SELECT * FROM sandbox_runs ORDER BY created_at DESC");
      res.json({ runs: rows });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to list sandbox runs.' });
    }
  });

  app.delete('/api/db/runs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await dbRun("DELETE FROM sandbox_runs WHERE id = ?", [id]);
      res.json({ success: true, message: 'Execution log cleared from SQLite database.' });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to delete execution run.' });
    }
  });

  app.post('/api/db/runs/clear', async (req, res) => {
    try {
      await dbRun("DELETE FROM sandbox_runs");
      res.json({ success: true, message: 'All sandbox testing history truncated in SQL.' });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to clear execution history.' });
    }
  });

  // C. Relational Kaggle CSV/Feedback Records in SQLite
  app.get('/api/db/feedback', async (req, res) => {
    try {
      const { search, dataset } = req.query;
      let query = "SELECT * FROM kaggle_feedback WHERE 1=1";
      const params: any[] = [];

      // Filter by dataset segment (can be 'general' or 'neon')
      if (dataset) {
        query += " AND dataset = ?";
        params.push(String(dataset));
      } else {
        query += " AND dataset = 'general'";
      }
      
      if (search && String(search).trim()) {
        query += " AND (customer_name LIKE ? OR ticket_text LIKE ? OR product_ordered LIKE ?)";
        const term = `%${String(search).trim()}%`;
        params.push(term, term, term);
      }
      
      query += " ORDER BY id ASC";
      const rows = await dbAll(query, params);
      res.json({ feed_rows: rows });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to search Kaggle feedback SQL database.' });
    }
  });

  app.post('/api/db/feedback', async (req, res) => {
    try {
      const { ticket_id, customer_name, product_ordered, ticket_text, urgency_level, dataset } = req.body;
      if (!customer_name || !ticket_text) {
        return res.status(400).json({ error: 'Customer name and ticket text are required.' });
      }
      const tid = ticket_id || String(Math.floor(1000 + Math.random() * 9000));
      const ds = dataset || 'general';
      const { id } = await dbRun(
        `INSERT INTO kaggle_feedback (ticket_id, customer_name, product_ordered, ticket_text, urgency_level, dataset) VALUES (?, ?, ?, ?, ?, ?)`,
        [tid, customer_name, product_ordered || 'General product', ticket_text, urgency_level || 'Medium', ds]
      );
      res.json({ success: true, id, message: 'Customer feedback row committed to SQL database!' });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to insert feedback row.' });
    }
  });

  app.delete('/api/db/feedback/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await dbRun("DELETE FROM kaggle_feedback WHERE id = ?", [id]);
      res.json({ success: true, message: 'Ticket feedback row deleted from SQL database.' });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to delete feedback row.' });
    }
  });

  // Serve static files in production or hot-reload dev middleware
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Prompt Studio Server] running on http://localhost:${PORT}`);
  });
}

startServer();
