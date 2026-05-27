import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Play, 
  RefreshCw, 
  Compass, 
  FileCode, 
  Sliders, 
  Cpu, 
  Info, 
  Wand2, 
  Terminal,
  ArrowRight,
  SlidersHorizontal,
  Lightbulb
} from 'lucide-react';

// Design-driven preset prompts
interface Preset {
  id: string;
  title: string;
  category: string;
  draft: string;
  tone: string;
  language: string;
  description: string;
}

const PRESETS: Preset[] = [
  {
    id: 'json-extractor',
    title: 'Customer Ticket Extract',
    category: 'Data Extraction',
    draft: 'Extract all details from this support ticket.\nFind the customer name, order number, critical issues mentioned, and urgency level.\nFormat the output as a clean JSON.\n\nTicket source text:\n{{ticket_text}}\nUrgency rule: If order is delayed, set {{urgency_override}} accordingly.',
    tone: 'clinical',
    language: 'English',
    description: 'Structure arbitrary text logs into bullet-proof JSON schemas.'
  },
  {
    id: 'email-composer',
    title: 'Executive Outreach Writer',
    category: 'Corporate Messaging',
    draft: 'Help me write an email outreach. The reader is {{company_name}} executive who leads the {{department}} department.\nWe want to introduce our solution for {{pain_point}} and propose a 10-minute slot on {{meeting_day}}.\nMake it crisp and authoritative.',
    tone: 'professional',
    language: 'English',
    description: 'Transform quick details into elite sales and collaboration emails.'
  },
  {
    id: 'code-reviewer',
    title: 'Security & Complexity Auditor',
    category: 'Software Engineering',
    draft: 'Review this custom script for security vulnerabilities and algorithmic bottlenecks.\nCode snippet:\n{{code_block}}\n\nFocus specifically on {{vulnerability_type}} concerns and recommend refactoring.',
    tone: 'technical',
    language: 'English',
    description: 'Inspect algorithms and secure logic patterns before deployment.'
  },
  {
    id: 'creative-writing',
    title: 'Atmospheric Story Architect',
    category: 'Creative Arts',
    draft: 'Write a gripping mystery prologue where a protagonist named {{detective}} investigates a locked-room scene in {{location}}.\nTheme revolves around a missing {{target_item}}.\nSet the mood to {{atmosphere}}.',
    tone: 'creative',
    language: 'English',
    description: 'Craft prose with high atmospheric fidelity and customized variables.'
  }
];

export default function App() {
  // Primary workflows
  const [draftPrompt, setDraftPrompt] = useState<string>(PRESETS[0].draft);
  const [tone, setTone] = useState<string>('professional');
  const [language, setLanguage] = useState<string>('English');
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  // Core System Prompt output
  const [refinedPrompt, setRefinedPrompt] = useState<string>(`# Role
You are an advanced Customer Success automated coordinator. Your task is to process incoming customer support requests and extract critical transaction signals.

# Primary Mission
Parse the customer ticket details to build a deterministic JSON object mapping the transaction details and priority metrics.

# Input variables to evaluate
- {{ticket_text}}: The complete, untrusted source text of the customer inquiry.
- {{urgency_override}}: The prioritisation rating.

# Output constraints & schema
Your response must be strictly in JSON. Do not wrap files in markdown tags.
Required fields:
- customerName (string or null)
- orderNumber (string or null)
- coreIssues (array of strings)
- calculatedUrgency (enum: "low", "medium", "high")`);

  // Variable Management
  const [variables, setVariables] = useState<Array<{ name: string; default: string; description: string }>>([
    { name: 'ticket_text', default: 'My order #9941 has not arrived. I need this package by Friday for my anniversary or I will cancel.', description: 'source ticket' },
    { name: 'urgency_override', default: 'Immediate', description: 'urgency priority' }
  ]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({
    ticket_text: 'My order #9941 has not arrived. I need this package by Friday for my anniversary or I will cancel.',
    urgency_override: 'Immediate'
  });
  const [isExtractingVars, setIsExtractingVars] = useState<boolean>(false);

  // Test Sandbox Execution
  const [userQuery, setUserQuery] = useState<string>('Analyze ordering dispute.');
  const [sandboxResult, setSandboxResult] = useState<string>('');
  const [isRunningSandbox, setIsRunningSandbox] = useState<boolean>(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  // Visual UI state
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'prompt' | 'sandbox' | 'docs'>('prompt');
  const [codeLanguage, setCodeLanguage] = useState<'node' | 'streamlit'>('streamlit');

  // Jupyter Notebook (.ipynb) states
  const [notebookData, setNotebookData] = useState<any>({
    cells: [
      {
        cell_type: "markdown",
        source: [
          "# Kaggle Dataset Exploration: Customer Support Reviews\n",
          "This notebook parses real customer dispute texts. Below, we'll configure dynamic templates."
        ]
      },
      {
        cell_type: "code",
        source: [
          "# Define raw review sample template variable for test sandboxing\n",
          "sample_review_data = \"\"\"Ref: #7743. Damage occurred during freight delivery on Sunday night. Please replace the item.\"\"\"\n",
          "print(len(sample_review_data))"
        ]
      },
      {
        cell_type: "markdown",
        source: [
          "## Dynamic Prompt Template Design\n",
          "Review template concept parsed from cell variables below:"
        ]
      },
      {
        cell_type: "code",
        source: [
          "# Custom script evaluation\n",
          "draft_system_instruction = 'Review this custom script for security concerns. Target code: {{code_block}}'\n"
        ]
      }
    ]
  });
  const [selectedNotebookCellIndex, setSelectedNotebookCellIndex] = useState<number>(1);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [notebookError, setNotebookError] = useState<string | null>(null);

  const handleNotebookFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotebookError(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.cells && Array.isArray(parsed.cells)) {
          setNotebookData(parsed);
          setSelectedNotebookCellIndex(0);
        } else {
          setNotebookError("Invalid Jupyter Notebook format. The uploaded JSON is missing a root 'cells' array.");
        }
      } catch (err) {
        setNotebookError("Failed to parse .ipynb JSON content. Make sure the file is a valid Jupyter Notebook JSON export.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setNotebookError(null);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.cells && Array.isArray(parsed.cells)) {
            setNotebookData(parsed);
            setSelectedNotebookCellIndex(0);
          } else {
            setNotebookError("Invalid Jupyter Notebook format. Missing 'cells' array.");
          }
        } catch (err) {
          setNotebookError("Failed to parse JSON content.");
        }
      };
      reader.readAsText(file);
    }
  };

  // CSV & SQLite Relational States
  const [csvContent, setCsvContent] = useState<string>('');
  const [csvRows, setCsvRows] = useState<Array<Record<string, string>>>([]);
  const [selectedCsvRowIndex, setSelectedCsvRowIndex] = useState<number | null>(null);
  const [activeKaggleTab, setActiveKaggleTab] = useState<'notebook' | 'csv'>('notebook');

  // SQLite Relational Database States
  const [currentDataset, setCurrentDataset] = useState<'general' | 'neon'>('general');
  const [dbSearchTerm, setDbSearchTerm] = useState<string>('');
  const [savedPrompts, setSavedPrompts] = useState<Array<any>>([]);
  const [sandboxHistory, setSandboxHistory] = useState<Array<any>>([]);
  const [showAddTicketForm, setShowAddTicketForm] = useState<boolean>(false);
  const [newCustomer, setNewCustomer] = useState({
    ticket_id: '',
    customer_name: '',
    product_ordered: '',
    ticket_text: '',
    urgency_level: 'Medium'
  });
  const [promptBlueprintName, setPromptBlueprintName] = useState<string>('');
  const [showSaveBlueprintModal, setShowSaveBlueprintModal] = useState<boolean>(false);

  // DB Loaders
  const fetchSavedPrompts = async () => {
    try {
      const response = await fetch('/api/db/prompts');
      if (response.ok) {
        const data = await response.json();
        setSavedPrompts(data.prompts || []);
      }
    } catch (e) {
      console.error('Failed to fetch prompts from SQLite:', e);
    }
  };

  const fetchSandboxHistory = async () => {
    try {
      const response = await fetch('/api/db/runs');
      if (response.ok) {
        const data = await response.json();
        setSandboxHistory(data.runs || []);
      }
    } catch (e) {
      console.error('Failed to fetch sandbox runs from SQLite:', e);
    }
  };

  const fetchFeedbackFromSql = async (searchStr: string = '', datasetParam?: 'general' | 'neon') => {
    const activeDataset = datasetParam !== undefined ? datasetParam : currentDataset;
    try {
      const response = await fetch(`/api/db/feedback?search=${encodeURIComponent(searchStr)}&dataset=${activeDataset}`);
      if (response.ok) {
        const data = await response.json();
        setCsvRows(data.feed_rows || []);
      }
    } catch (e) {
      console.error('Failed to retrieve feedback rows from SQLite:', e);
    }
  };

  const savePromptToSql = async () => {
    if (!promptBlueprintName.trim()) return;
    try {
      const response = await fetch('/api/db/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: promptBlueprintName,
          system_prompt: refinedPrompt,
          variables_json: JSON.stringify(variables)
        })
      });
      if (response.ok) {
        setPromptBlueprintName('');
        setShowSaveBlueprintModal(false);
        setCopiedIndex('blueprint_saved');
        setTimeout(() => setCopiedIndex(null), 1500);
        fetchSavedPrompts();
      }
    } catch (e) {
      console.error('Failed to save blueprint in SQL:', e);
    }
  };

  const deletePromptFromSql = async (id: number) => {
    try {
      const response = await fetch(`/api/db/prompts/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchSavedPrompts();
      }
    } catch (e) {
      console.error('Failed to remove prompt from DB:', e);
    }
  };

  const clearSandboxHistory = async () => {
    try {
      const response = await fetch('/api/db/runs/clear', { method: 'POST' });
      if (response.ok) {
        fetchSandboxHistory();
      }
    } catch (e) {
      console.error('Failed to clear runs history:', e);
    }
  };

  const deleteSandboxHistoryItem = async (id: number) => {
    try {
      const response = await fetch(`/api/db/runs/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchSandboxHistory();
      }
    } catch (e) {
      console.error('Failed to delete history item:', e);
    }
  };

  const insertFeedbackToSql = async () => {
    if (!newCustomer.customer_name || !newCustomer.ticket_text) return;
    try {
      const response = await fetch('/api/db/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCustomer, dataset: currentDataset })
      });
      if (response.ok) {
        setNewCustomer({
          ticket_id: '',
          customer_name: '',
          product_ordered: '',
          ticket_text: '',
          urgency_level: 'Medium'
        });
        setShowAddTicketForm(false);
        fetchFeedbackFromSql(dbSearchTerm, currentDataset);
        setSelectedCsvRowIndex(0);
      }
    } catch (e) {
      console.error('Failed to insert ticket row:', e);
    }
  };

  const deleteFeedbackFromSql = async (id: number) => {
    try {
      const response = await fetch(`/api/db/feedback/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchFeedbackFromSql(dbSearchTerm);
        setSelectedCsvRowIndex(0);
      }
    } catch (e) {
      console.error('Failed to delete support record:', e);
    }
  };

  // Fetch local Kaggle files and database records on component mount
  useEffect(() => {
    const fetchLocalKaggleData = async () => {
      try {
        const response = await fetch('/api/load-local-kaggle');
        if (response.ok) {
          const data = await response.json();
          if (data.notebook) {
            setNotebookData(data.notebook);
          }
        }
      } catch (err) {
        console.error("Failed to load workspace notebooks:", err);
      }
    };

    fetchLocalKaggleData();
    fetchFeedbackFromSql('', 'general');
    fetchSavedPrompts();
    fetchSandboxHistory();
  }, []);

  // Load preset helper
  const handleSelectPreset = (preset: Preset) => {
    setDraftPrompt(preset.draft);
    setTone(preset.tone);
    setLanguage(preset.language);
    
    // Auto-extract initial variables for the preset
    extractVariablesFromText(preset.draft);
  };

  // Local regex-based variable extractor to keep UI reactive
  const extractVariablesFromText = (text: string) => {
    const regex = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
    const found: string[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!found.includes(match[1])) {
        found.push(match[1]);
      }
    }
    
    const newVars = found.map(name => {
      const existing = variables.find(v => v.name === name);
      return {
        name,
        default: existing?.default || 'Example entry',
        description: existing?.description || `Value for {{${name}}}`
      };
    });

    setVariables(newVars);
    
    const newValues: Record<string, string> = {};
    newVars.forEach(v => {
      newValues[v.name] = variableValues[v.name] || v.default;
    });
    setVariableValues(newValues);
  };

  // Automatically extract variables locally as draft or refined prompt changes
  useEffect(() => {
    extractVariablesFromText(refinedPrompt);
  }, [refinedPrompt]);

  // Command handlers
  const handleEnhance = async () => {
    setIsEnhancing(true);
    setEnhanceError(null);
    try {
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: draftPrompt, tone, language }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred during prompt design.');
      }
      
      setRefinedPrompt(data.enhancedPrompt);
      // Switch active tab to the refined workshop/sandbox preview flow
      setActiveTab('prompt');
    } catch (err: any) {
      setEnhanceError(err?.message || 'Failed to optimize prompt.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleFetchAPIKeysVariables = async () => {
    setIsExtractingVars(true);
    try {
      const response = await fetch('/api/generate-variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: refinedPrompt }),
      });
      const data = await response.json();
      if (data.variables && Array.isArray(data.variables)) {
        setVariables(data.variables);
        const nextVals: Record<string, string> = {};
        data.variables.forEach((v: any) => {
          nextVals[v.name] = variableValues[v.name] || v.default || '';
        });
        setVariableValues(nextVals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtractingVars(false);
    }
  };

  const handleRunSandbox = async () => {
    setIsRunningSandbox(true);
    setSandboxError(null);
    setSandboxResult('');
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: refinedPrompt,
          variables: variableValues,
          userText: userQuery
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Execution returned an error state.');
      }
      setSandboxResult(data.result);
      fetchSandboxHistory(); // Real-time refresh from SQLite running logs database
      setActiveTab('sandbox');
    } catch (err: any) {
      setSandboxError(err?.message || 'Failed to simulate LLM sandbox run.');
    } finally {
      setIsRunningSandbox(false);
    }
  };

  // Copy helper
  const triggerCopy = (text: string, labelId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(labelId);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  // Modern Markdown styling helper
  const renderStyledOutput = (text: string) => {
    if (!text) return <p className="text-slate-500 italic">No execution logs output yet. Setup target inputs and click &quot;Run Test Sandbox&quot;.</p>;

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Very basic block code matching
      if (line.startsWith('```')) {
        return null; // Skip markdown boundary lines for custom styling
      }
      
      const isHeader = line.startsWith('#');
      const isList = line.trim().startsWith('-') || line.trim().startsWith('*');
      
      if (isHeader) {
        const depth = (line.match(/^#+/) || ['#'])[0].length;
        const cleanText = line.replace(/^#+\s*/, '');
        const sizeClass = depth === 1 ? 'text-lg font-bold text-slate-100 mt-4 mb-2' : 'text-md font-semibold text-slate-200 mt-3 mb-1';
        return <h4 key={idx} className={`${sizeClass} border-b border-slate-800/50 pb-1`}>{cleanText}</h4>;
      }
      
      if (isList) {
        return (
          <div key={idx} className="flex items-start gap-2 pl-2 my-1 text-slate-300">
            <span className="text-indigo-400 mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
            <span>{line.replace(/^-\s*/, '')}</span>
          </div>
        );
      }

      // Check if line looks like key: value or code block details
      const isCodeLike = line.includes('":') || line.includes('{') || line.includes('}');
      return (
        <p key={idx} className={`my-1.5 text-slate-300 break-words leading-relaxed ${isCodeLike ? 'font-mono text-xs text-indigo-200 bg-slate-950/60 py-0.5 px-1 rounded' : ''}`}>
          {line}
        </p>
      );
    });
  };

  // Generate production ready Node SDK or Python Streamlit App code matching latest rules
  const getGeneratedCode = () => {
    if (codeLanguage === 'streamlit') {
      return `import streamlit as st
import os
import re
from google import genai
from google.genai import types

# Setup streamlined Streamlit Page configuration 
st.set_page_config(
    page_title="AI Prompt Studio - Streamlit Sandbox",
    page_icon="✨",
    layout="wide",
)

st.title("✨ Refined Prompt Sandbox")
st.caption("Deploy and test custom prompt boundaries in real-time using Streamlit & google-genai.")

# Sidebar Credentials Config
api_key = st.sidebar.text_input(
    "GEMINI_API_KEY",
    type="password",
    value=os.environ.get("GEMINI_API_KEY", ""),
    help="Default loads from environment. Required to execute content."
)

if not api_key:
    st.warning("Please enter your GEMINI_API_KEY in the sidebar configuration.")
    st.stop()

# Initialize modern Gemini SDK client matching google-genai guidelines
client = genai.Client(api_key=api_key)

# Compiled system instruction structure
system_prompt = """${refinedPrompt.replace(/"""/g, '\\"\\"\\""')}"""

st.subheader("📋 Inject Variable Values")
variables = ${JSON.stringify(variables, null, 2)}

variable_values = {}
for var in variables:
    name = var['name']
    desc = var['description']
    default_val = var['default']
    
    # Textareas for multi-line inputs, single-inputs for standard variables
    if any(suffix in name for suffix in ['text', 'block', 'transcript', 'prompt', 'code']):
        variable_values[name] = st.text_area(f"{{{{{name}}}}} ({desc})", value=default_val, height=110)
    else:
        variable_values[name] = st.text_input(f"{{{{{name}}}}} ({desc})", value=default_val)

st.write("---")

user_query = st.text_input("Model Input Query (Simulated Message)", value="${userQuery.replace(/"/g, '\\"')}")

if st.button("🚀 Run Prompt Sandbox", type="primary"):
    with st.spinner("Executing simulation payload..."):
        try:
            processed_system = system_prompt
            for key, val in variable_values.items():
                processed_system = re.sub(r"{{\\\\s*" + re.escape(key) + r"\\\\s*}}", str(val), processed_system)
                
            response = client.models.generate_content(
                model='gemini-2.1-flash',
                contents=user_query,
                config=types.GenerateContentConfig(
                    system_instruction=processed_system,
                    temperature=0.7,
                )
            )
            
            st.success("Execution Complete!")
            st.subheader("🏁 Sandbox Output")
            st.markdown(response.text)
            
        except Exception as e:
            st.error(f"Error executing sandbox: {str(e)}")`;
    }

    return `import { GoogleGenAI } from "@google/genai";

// Initialize using named parameter and User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function runPrompt() {
  const systemPrompt = \`${refinedPrompt.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;
  
  // Inject target application values
  let processedPrompt = systemPrompt;
  const variables = ${JSON.stringify(variableValues, null, 2)};
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(\`\\\\{\\\\{[\\\\s]*\${key}[\\\\s]*\\\\}\\\\}\`, 'g');
    processedPrompt = processedPrompt.replace(regex, String(value));
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: "${userQuery.replace(/"/g, '\\"')}",
    config: {
      systemInstruction: processedPrompt,
      temperature: 0.7,
    }
  });

  console.log("Model response:", response.text);
}

runPrompt();`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200" id="studio-app-root">
      {/* Top Header Navigation Line */}
      <header className="border-b border-slate-900 bg-slate-950 px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur" id="page-header">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-md font-bold tracking-tight text-white font-mono">AI Prompt Studio</h1>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-500/20">Gemini 3.5 Engine</span>
            </div>
            <p className="text-xs text-slate-400">Design, optimize, and sandbox enterprise-grade system prompts</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800/80">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-slate-300 text-[11px]">Server Proxy Active</span>
          </div>
        </div>
      </header>

      {/* Primary Workspace Layout */}
      <main className="flex-1 flex flex-col gap-6 p-5 max-w-[1920px] mx-auto w-full overflow-y-auto" id="workspace-grid">
        {/* Jupyter Notebook (.ipynb) / Kaggle Dataset Parser Block */}
        <section className="bg-slate-900/40 border border-slate-900 rounded-xl p-5 flex flex-col gap-4 shadow-xl shadow-indigo-950/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-purple-600/15 rounded-lg border border-purple-500/20 flex items-center justify-center">
                <span className="text-xl">📓</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  Jupyter Notebook (.ipynb) & Kaggle Dataset Extractor
                  <span className="text-[10px] bg-purple-500/10 text-purple-300 font-mono px-2 py-0.5 rounded border border-purple-500/20">Active Cell Analyzer</span>
                </h2>
                <p className="text-xs text-slate-400 font-sans">Analyze Kaggle datasets & notebooks. Extract system prompts, rules, variables, or raw ticket rows instantly.</p>
              </div>
            </div>
            
            {/* File Drag and Drop/Click Zone */}
            <div className="flex items-center gap-3">
              <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800 mr-2">
                <button
                  type="button"
                  onClick={() => setActiveKaggleTab('notebook')}
                  className={`px-3 py-1 text-xs font-mono rounded ${activeKaggleTab === 'notebook' ? 'bg-purple-600 font-bold text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  📓 Notebook Cells
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveKaggleTab('csv');
                    if (selectedCsvRowIndex === null && csvRows.length > 0) {
                      setSelectedCsvRowIndex(0);
                    }
                  }}
                  className={`px-3 py-1 text-xs font-mono rounded ${activeKaggleTab === 'csv' ? 'bg-indigo-600 font-bold text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  📊 Kaggle CSV Rows
                </button>
              </div>

              <label 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`group flex items-center gap-2.5 px-4 py-2 bg-slate-950 border ${dragActive ? 'border-purple-500 bg-purple-500/5' : 'border-slate-800 hover:border-purple-500/40'} rounded-lg text-xs font-semibold hover:text-purple-300 transition-all cursor-pointer`}
              >
                <span>➕ Upload IPYNB</span>
                <input 
                  type="file" 
                  accept=".ipynb" 
                  onChange={handleNotebookFileUpload} 
                  className="hidden" 
                />
              </label>
              <button
                onClick={() => {
                  setNotebookData({
                     cells: [
                       {
                         cell_type: "markdown",
                         source: [
                           "# Customer Sentiment Model Draft\n",
                           "Analyzing the Kaggle review datasets for fine-tuned system boundaries."
                         ]
                       },
                       {
                         cell_type: "code",
                         source: [
                           "# Input review mock\n",
                           "feedback = \"\"\"I ordered this set but it was broken. Urgently refund or deliver a brand new one.\"\"\"\n",
                           "print('Target payload configured')"
                         ]
                       },
                       {
                         cell_type: "markdown",
                         source: [
                           "## Prompt Guidelines\n",
                           "The bot must extract names, orders, issues, and prioritize delayed items."
                         ]
                       },
                       {
                         cell_type: "code",
                         source: [
                           "# Fine-tuned Prompt Template\n",
                           "draft_prompt = 'Analyze ticket. Customer value: {{customer_name}}. Dispute: {{ticket_text}}'"
                         ]
                       }
                     ]
                  });
                  setSelectedNotebookCellIndex(1);
                  setNotebookError(null);
                }}
                className="text-[10px] text-slate-400 hover:text-indigo-400 transition-colors underline font-mono cursor-pointer bg-transparent border-0"
              >
                Reset Default Mock
              </button>
            </div>
          </div>

          {notebookError && (
            <div className="p-2 bg-red-950/20 border border-red-500/20 text-red-400 rounded text-xs font-mono">
              ⚠️ {notebookError}
            </div>
          )}

          {/* Active Tab: Notebook cells list/extractor */}
          {activeKaggleTab === 'notebook' && notebookData && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left pane: cell list */}
              <div className="md:col-span-5 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono tracking-wider">
                  <span>NBCONVERT SUMMARY STATS</span>
                  <div className="flex gap-2">
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80 text-purple-300 font-semibold text-[9px]">
                      {notebookData.cells.filter((c: any) => c.cell_type === "code").length} Code Blocks
                    </span>
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80 text-indigo-300 font-semibold text-[9px]">
                      {notebookData.cells.filter((c: any) => c.cell_type === "markdown").length} Markdown
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 max-h-[160px] overflow-y-auto space-y-1.5 pr-2">
                  {notebookData.cells.map((cell: any, idx: number) => {
                    const text = (cell.source || []).join("").substring(0, 60);
                    const isSelected = selectedNotebookCellIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedNotebookCellIndex(idx)}
                        className={`w-full text-left p-2.5 rounded text-xs transition-all flex items-start gap-2 border ${isSelected ? 'border-purple-500/40 bg-purple-500/10 text-purple-200' : 'border-slate-850 hover:border-slate-800 bg-slate-950/20 text-slate-400 hover:text-slate-200'} cursor-pointer`}
                      >
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono leading-none ${cell.cell_type === 'code' ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/20' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                          {cell.cell_type.toUpperCase()}
                        </span>
                        <span className="truncate font-mono text-[11px] flex-1">{text || "(Empty Block)"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right pane: selected cell viewer & active inject actions */}
              <div className="md:col-span-7 flex flex-col gap-2.5 bg-slate-950/50 p-4 rounded-lg border border-slate-900 justify-between min-h-[160px]">
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono border-b border-slate-900 pb-1.5 mb-2">
                    <span>CELL EXTRACT SOURCE (BLOCK #{selectedNotebookCellIndex + 1})</span>
                    <span className="text-purple-400 font-bold uppercase">{notebookData.cells[selectedNotebookCellIndex]?.cell_type} CELL</span>
                  </div>
                  <pre className="text-[11px] font-mono text-purple-200 max-h-[100px] overflow-y-auto whitespace-pre-wrap leading-relaxed bg-slate-950 p-2 rounded border border-slate-900">
                    {(notebookData.cells[selectedNotebookCellIndex]?.source || []).join("")}
                  </pre>
                </div>
                
                <div className="flex gap-2 justify-end pt-2 border-t border-slate-900">
                  <button
                    onClick={() => {
                      const text = (notebookData.cells[selectedNotebookCellIndex]?.source || []).join("");
                      if (text) {
                        setDraftPrompt(text);
                        extractVariablesFromText(text);
                        setCopiedIndex('draft_injected');
                        setTimeout(() => setCopiedIndex(null), 1500);
                      }
                    }}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 font-semibold text-xs text-white rounded transition-all cursor-pointer flex items-center gap-1.5 border-0"
                  >
                    🚀 {copiedIndex === 'draft_injected' ? 'Injected into Draft!' : 'Inject Cell to Prompt Draft'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: CSV Rows display and injector */}
          {activeKaggleTab === 'csv' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left pane: CSV list */}
              <div className="md:col-span-5 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono tracking-wider">
                  <span>KAGGLER WORKSPACE SQLITE RECORDS</span>
                  <span className={`px-2 py-0.5 rounded border font-semibold text-[9px] ${currentDataset === 'neon' ? 'bg-emerald-950 text-emerald-300 border-emerald-500/20' : 'bg-slate-950 text-indigo-300 border-slate-800/80'}`}>
                    {csvRows.length} {currentDataset === 'neon' ? 'Neon Tickets' : 'Disputes'} in DB
                  </span>
                </div>

                {/* Dataset Segment Selector */}
                <div className="bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/60 flex items-center justify-between gap-1.5 text-[11px] font-sans">
                  <span className="text-slate-400 font-mono tracking-wide pl-1.5 font-bold uppercase text-[9px]">Dataset Select:</span>
                  <div className="flex bg-slate-950 p-0.5 rounded border border-slate-800/40">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentDataset('general');
                        fetchFeedbackFromSql(dbSearchTerm, 'general');
                        setSelectedCsvRowIndex(0);
                      }}
                      className={`px-3 py-1 text-[10px] font-medium rounded transition-all cursor-pointer ${currentDataset === 'general' ? 'bg-indigo-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      📊 General Support
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentDataset('neon');
                        fetchFeedbackFromSql(dbSearchTerm, 'neon');
                        setSelectedCsvRowIndex(0);
                      }}
                      className={`px-3 py-1 text-[10px] font-medium rounded transition-all cursor-pointer flex items-center gap-1 ${currentDataset === 'neon' ? 'bg-emerald-600 text-white font-semibold shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      ⚡ Neon.tech Postgres
                    </button>
                  </div>
                </div>

                {/* Database Live SQL Search Controller */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Search ${currentDataset === 'neon' ? 'neon' : 'general'} rows via SQL...`}
                    value={dbSearchTerm}
                    onChange={(e) => {
                      setDbSearchTerm(e.target.value);
                      fetchFeedbackFromSql(e.target.value);
                    }}
                    className="flex-1 px-3 py-1.5 bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded outline-none focus:border-indigo-500 font-sans"
                  />
                  <button
                    onClick={() => setShowAddTicketForm(!showAddTicketForm)}
                    type="button"
                    className="px-2.5 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/30 text-indigo-300 font-mono text-[11px] rounded transition-all flex items-center gap-1 cursor-pointer"
                  >
                    {showAddTicketForm ? '✕ Close Form' : '➕ Add Record'}
                  </button>
                </div>

                {/* Inline Ticket Inserter Form in SQLite */}
                {showAddTicketForm && (
                  <div className="bg-slate-950/80 p-3 rounded border border-indigo-500/25 space-y-2 mt-1">
                    <span className="text-[10px] text-indigo-300 font-mono block font-bold">SQLITE TABLE INSERTER</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Customer Name"
                        value={newCustomer.customer_name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, customer_name: e.target.value })}
                        className="px-2 py-1 bg-slate-900 text-xs text-white border border-slate-800 rounded outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Product Ordered"
                        value={newCustomer.product_ordered}
                        onChange={(e) => setNewCustomer({ ...newCustomer, product_ordered: e.target.value })}
                        className="px-2 py-1 bg-slate-900 text-xs text-white border border-slate-800 rounded outline-none"
                      />
                    </div>
                    <textarea
                      placeholder="Feedback ticket text (substitutable prompt input)"
                      value={newCustomer.ticket_text}
                      rows={2}
                      onChange={(e) => setNewCustomer({ ...newCustomer, ticket_text: e.target.value })}
                      className="w-full px-2 py-1 bg-slate-900 text-xs text-white border border-slate-800 rounded outline-none font-mono"
                    />
                    <div className="flex justify-between items-center pt-1">
                      <select
                        value={newCustomer.urgency_level}
                        onChange={(e) => setNewCustomer({ ...newCustomer, urgency_level: e.target.value })}
                        className="bg-slate-900 text-xs text-slate-300 border border-slate-800 px-1 py-0.5 rounded outline-none"
                      >
                        <option value="High">🔴 High Urgency</option>
                        <option value="Medium">🟡 Medium Urgency</option>
                        <option value="Low">🟢 Low Urgency</option>
                      </select>
                      <button
                        onClick={insertFeedbackToSql}
                        type="button"
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold rounded cursor-pointer border-0"
                      >
                        Commit SQL Row
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="flex-1 max-h-[180px] overflow-y-auto space-y-1.5 pr-2 mt-1">
                  {csvRows.length > 0 ? (
                    csvRows.map((row: any, idx) => {
                      const isSelected = selectedCsvRowIndex === idx;
                      return (
                        <div key={idx} className="relative group/row">
                          <button
                            onClick={() => setSelectedCsvRowIndex(idx)}
                            className={`w-full text-left p-2.5 rounded text-xs transition-all flex items-start justify-between border ${isSelected ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200' : 'border-slate-850 hover:border-slate-800 bg-slate-950/20 text-slate-400 hover:text-slate-200'} cursor-pointer`}
                          >
                            <div className="flex flex-col truncate flex-1 pr-6">
                              <span className="font-semibold text-slate-200 truncate">{row.customer_name || 'Generic Customer'}</span>
                              <span className="text-[10px] text-slate-400 truncate mt-0.5">{row.product_ordered}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono leading-none ${row.urgency_level === 'High' ? 'bg-red-950 text-red-300 border border-red-500/20' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}>
                              {row.urgency_level}
                            </span>
                          </button>
                          
                          {/* Live SQL Delete action */}
                          <button
                            title="Remove SQL Database Row"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (row.id) {
                                deleteFeedbackFromSql(row.id);
                              }
                            }}
                            className="absolute right-2 top-2.5 p-1 bg-red-950/20 hover:bg-red-500 hover:text-white rounded border border-red-500/25 text-red-400 opacity-0 group-hover/row:opacity-100 transition-opacity cursor-pointer text-[10px]"
                          >
                            🗑️
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center p-6 text-slate-500 italic text-xs">
                      No matching records found in SQL database feedback table.
                    </div>
                  )}
                </div>
              </div>

              {/* Right pane: CSV Row Detailer */}
              <div className="md:col-span-7 flex flex-col gap-2.5 bg-slate-950/50 p-4 rounded-lg border border-slate-900 justify-between min-h-[160px]">
                {selectedCsvRowIndex !== null && csvRows[selectedCsvRowIndex] ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono border-b border-slate-900 pb-1.5 mb-2">
                        <span>ROW DETAILS (INDEX #{selectedCsvRowIndex + 1} - SQLITE ID #{csvRows[selectedCsvRowIndex].id})</span>
                        <span className="text-indigo-400 font-bold uppercase">{csvRows[selectedCsvRowIndex].customer_name}</span>
                      </div>
                      <div className="space-y-2 max-h-[100px] overflow-y-auto pr-1">
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono uppercase font-semibold">Product Trigger: </span>
                          <span className="text-xs text-indigo-300 font-mono">{csvRows[selectedCsvRowIndex].product_ordered}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-mono uppercase block font-semibold mb-0.5">Ticket Context:</span>
                          <p className="text-xs text-slate-300 bg-slate-950 p-2 rounded border border-slate-900/80 font-mono leading-relaxed max-height-[65px] overflow-y-auto break-words whitespace-pre-wrap">
                            {csvRows[selectedCsvRowIndex].ticket_text}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-900">
                      <button
                        onClick={() => {
                          const row = csvRows[selectedCsvRowIndex];
                          if (row && row.ticket_text) {
                            const updatedValues = { ...variableValues };
                            updatedValues['ticket_text'] = row.ticket_text;
                            if (row.customer_name) {
                              updatedValues['customer_name'] = row.customer_name;
                            }
                            setVariableValues(updatedValues);
                            setCopiedIndex('csv_injected');
                            setTimeout(() => setCopiedIndex(null), 1500);
                          }
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white rounded transition-all cursor-pointer flex items-center gap-1.5 border-0"
                      >
                        🚀 {copiedIndex === 'csv_injected' ? 'Injected to Sandbox!' : 'Inject Row to Sandbox Variables'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                    <p className="text-xs italic">Select a dataset records row from the left panel to inject details into your LLM variable editor immediately.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Dynamic Sandbox Workspace Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5" id="columns-container-row">

          {/* L1: Prompt Sculptor - 4/12 width */}
          <section className="xl:col-span-4 flex flex-col gap-4 bg-slate-900/20 border border-slate-900 rounded-xl p-5" id="column-sculptor">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-200">1. Sculpt Raw Idea</h2>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2.5 py-1 rounded">Stage I</span>
          </div>

          {/* Prompt Preset Slider Row */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
              <Compass className="h-3.5 w-3.5" />
              <span>Jumpstart with Blueprints</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="text-left text-xs p-2.5 rounded-lg border border-slate-800/80 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-900/80 transition-all cursor-pointer group"
                >
                  <p className="font-semibold text-slate-200 group-hover:text-indigo-300 truncate transition-colors">{preset.title}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{preset.category}</p>
                </button>
              ))}
            </div>

            {/* RELATIONAL CUSTOM BLUEPRINTS FROM SQLITE */}
            {savedPrompts.length > 0 && (
              <div className="border-t border-slate-800/60 pt-2.5 mt-1">
                <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-indigo-400 uppercase tracking-wider mb-2">
                  <span>💾 SQLite Custom Snapshot ({savedPrompts.length})</span>
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {savedPrompts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-850 hover:border-slate-800 group transition-all">
                      <button
                        type="button"
                        onClick={() => {
                          setRefinedPrompt(p.system_prompt);
                          if (p.variables_json) {
                            try {
                              const vArr = JSON.parse(p.variables_json);
                              if (Array.isArray(vArr)) {
                                setVariables(vArr);
                                const nextVals: Record<string, string> = {};
                                vArr.forEach((v: any) => {
                                  nextVals[v.name] = variableValues[v.name] || v.default || '';
                                });
                                setVariableValues(nextVals);
                              }
                            } catch (e) {}
                          }
                          setActiveTab('prompt'); // Switch to active prompt workbench view
                          setCopiedIndex('blueprint_loaded');
                          setTimeout(() => setCopiedIndex(null), 1500);
                        }}
                        className="text-left flex-1 truncate font-mono text-[11px] text-indigo-200 hover:text-indigo-300 transition-colors cursor-pointer"
                        title="Click to load snapshot back into workspace"
                      >
                        📐 {p.name}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => deletePromptFromSql(p.id)}
                        className="text-red-400 hover:text-red-300 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0 font-sans text-xs bg-transparent border-none"
                        title="Delete Prompts from Database"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Raw Prompt Draft Textarea */}
          <div className="flex-1 flex flex-col gap-1.5 min-h-[220px]">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Draft Workspace</span>
              <span className="text-[10px] text-slate-500 font-mono">Wrap parameters in {"{{variable}}"}</span>
            </label>
            <div className="relative flex-1 flex flex-col">
              <textarea
                value={draftPrompt}
                onChange={(e) => {
                  setDraftPrompt(e.target.value);
                  extractVariablesFromText(e.target.value);
                }}
                placeholder="Paste your rough prompt draft, concepts, or instructions here. Use double curly braces for dynamic arguments..."
                className="w-full h-full flex-1 p-4 bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/30 rounded-xl text-xs font-mono text-slate-200 leading-relaxed outline-none resize-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Quality Controls Block */}
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Sliders className="h-3.5 w-3.5 text-indigo-400" />
              <span>Parameters Setup</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Tone Selection */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-slate-400">Response Tone</span>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-slate-900 text-xs py-1.5 px-2.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-200 outline-none transition-colors"
                >
                  <option value="professional">🎓 Executive Professional</option>
                  <option value="creative">🎨 Imaginative Creative</option>
                  <option value="clinical">🔬 Analytical & Plain</option>
                  <option value="technical">💻 Engineering Strict</option>
                  <option value="casual">💬 Conversational Humorous</option>
                </select>
              </div>

              {/* Language Selection */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-slate-400">Target Output Language</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-slate-900 text-xs py-1.5 px-2.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-200 outline-none transition-colors"
                >
                  <option value="English">🇺🇸 English US</option>
                  <option value="Spanish">🇪🇸 Spanish</option>
                  <option value="French">🇫🇷 French</option>
                  <option value="German">🇩🇪 German</option>
                  <option value="Japanese">🇯🇵 Japanese</option>
                  <option value="Hindi">🇮🇳 Hindi</option>
                </select>
              </div>
            </div>

            {/* Enhance CTA Action Button */}
            <button
              onClick={handleEnhance}
              disabled={isEnhancing || !draftPrompt.trim()}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-semibold rounded-xl text-white shadow-lg shadow-indigo-500/20 active:shadow-none hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:cursor-not-allowed"
            >
              {isEnhancing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>Synthesizing System Rules with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-white group-hover:scale-110 transition-transform" />
                  <span>Refine & Structure Prompt</span>
                </>
              )}
            </button>
            {enhanceError && (
              <p className="text-[10px] bg-red-500/10 border border-red-500/20 py-2 px-3 rounded text-red-300 mt-1">{enhanceError}</p>
            )}
          </div>
        </section>

        {/* L2: Refiner & Code Workbench - 4/12 width */}
        <section className="xl:col-span-4 flex flex-col gap-4 bg-slate-900/20 border border-slate-900 rounded-xl p-5" id="column-refinement">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Cpu className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-slate-200">2. Refined Prompt Workbench</h2>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2.5 py-1 rounded">Stage II</span>
          </div>

          {/* Workbench Tabs (Prompts vs Code Blueprint) */}
          <div className="flex bg-slate-900/55 border border-slate-850/80 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('prompt')}
              className={`flex-1 text-center py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'prompt' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              System Blueprint
            </button>
            <button
              onClick={() => setActiveTab('sandbox')}
              className={`flex-1 text-center py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'sandbox' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Execution Output
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`flex-1 text-center py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'docs' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              SDK Code Export
            </button>
          </div>

          <div className="flex-1 flex flex-col bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden min-h-[380px]">
            {activeTab === 'prompt' && (
              <div className="flex-1 flex flex-col p-4 font-sans">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">STRUCTURED SYSTEM MARKDOWN</span>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    <button
                      onClick={() => setShowSaveBlueprintModal(true)}
                      className="text-[10px] bg-indigo-950/70 hover:bg-indigo-900 text-indigo-300 hover:text-indigo-200 font-medium py-1 px-2 rounded border border-indigo-700/20 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Snapshot configuration to SQLite Database"
                    >
                      💾 SQLite Capture
                    </button>
                    <button
                      onClick={handleFetchAPIKeysVariables}
                      disabled={isExtractingVars}
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium py-1 px-2.5 rounded border border-slate-850 transition-colors cursor-pointer"
                      title="Analyze refined variables"
                    >
                      {isExtractingVars ? 'Analysing...' : 'Re-sync Variables'}
                    </button>
                    <button
                      onClick={() => triggerCopy(refinedPrompt, 'prompt')}
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 text-indigo-300 font-medium py-1 px-2.5 rounded border border-slate-850 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedIndex === 'prompt' ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                <textarea
                  value={refinedPrompt}
                  onChange={(e) => setRefinedPrompt(e.target.value)}
                  className="w-full flex-1 bg-transparent border-0 outline-none text-xs font-mono text-indigo-100 placeholder:text-slate-700 leading-relaxed resize-none p-0 focus:ring-0"
                  placeholder="The generated premium system prompt will show here..."
                />
              </div>
            )}

            {activeTab === 'sandbox' && (
              <div className="flex-1 flex flex-col p-4 relative justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-slate-900 pb-2">
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider flex items-center gap-1">
                      <Terminal className="h-3 w-3 text-emerald-500" />
                      SIMULATED SANDBOX OUTPUT
                    </span>
                    <button
                      onClick={() => triggerCopy(sandboxResult, 'sandbox_copy')}
                      disabled={!sandboxResult}
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 disabled:text-slate-600 disabled:bg-transparent text-indigo-300 font-medium py-1 px-2 rounded border border-slate-850 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedIndex === 'sandbox_copy' ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="max-h-[220px] overflow-y-auto space-y-1">
                    {renderStyledOutput(sandboxResult)}
                  </div>
                </div>

                {/* SQLite run logs list */}
                {sandboxHistory.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-900/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-indigo-400 font-mono tracking-wider block">💾 Relational Run History Logs ({sandboxHistory.length})</span>
                      <button
                        onClick={clearSandboxHistory}
                        type="button"
                        className="text-[9px] text-red-400 hover:text-red-300 transition-colors uppercase font-mono bg-transparent border-none cursor-pointer"
                        title="Wipe sqlite sandbox history"
                      >
                        Clear All Logs
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {sandboxHistory.map((run: any) => (
                        <div key={run.id} className="p-2 rounded bg-slate-950/70 border border-slate-900 flex flex-col gap-1 text-[11px] relative group/run">
                          <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                            <span className="text-slate-400">{new Date(run.created_at).toLocaleTimeString()}</span>
                            <span className="text-slate-600">ID: #{run.id}</span>
                          </div>
                          
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-slate-500 uppercase font-mono block">VARIABLES INPUT:</span>
                            <p className="text-[10px] text-slate-300 font-mono line-clamp-1">{run.variables_used || "Empty Params"}</p>
                          </div>
                          
                          <div className="space-y-0.5 mt-0.5">
                            <span className="text-[9px] text-slate-500 uppercase font-mono block">EVALUATED OUTPUT:</span>
                            <p className="text-[10px] text-indigo-200 indent-1 line-clamp-2 italic leading-snug">{run.output_text}</p>
                          </div>

                          <div className="flex gap-2.5 items-center justify-end pt-1 mt-1 border-t border-slate-900/60">
                            <button
                              onClick={() => {
                                setSandboxResult(run.output_text);
                              }}
                              type="button"
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-all font-semibold bg-transparent border-none cursor-pointer"
                            >
                              🔍 View Log Output
                            </button>
                            <button
                              onClick={() => deleteSandboxHistoryItem(run.id)}
                              type="button"
                              className="text-[10px] text-red-400 hover:text-red-300 transition-all font-semibold bg-transparent border-none cursor-pointer opacity-0 group-hover/run:opacity-100"
                              title="Delete run record"
                            >
                              🗑️ Delete Log
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isRunningSandbox && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                    <RefreshCw className="h-7 w-7 text-indigo-500 animate-spin mb-3" />
                    <p className="text-xs text-slate-300 font-medium">Querying Sandbox Target Instance...</p>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-[240px]">Evaluating parameters, running dynamic variable injections, and mapping outputs through Gemini</p>
                  </div>
                )}
                
                {sandboxError && (
                  <p className="absolute bottom-4 left-4 right-4 text-[10px] bg-red-500/10 border border-red-500/20 py-2 px-3 rounded text-red-300 font-mono">{sandboxError}</p>
                )}
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="flex-1 flex flex-col p-4">
                <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg mb-3">
                  <button
                    onClick={() => setCodeLanguage('node')}
                    className={`flex-1 text-center py-1 rounded text-[10px] font-mono transition-all ${codeLanguage === 'node' ? 'bg-indigo-600/20 text-indigo-300 font-bold border border-indigo-500/25' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    TypeScript Node SDK
                  </button>
                  <button
                    onClick={() => setCodeLanguage('streamlit')}
                    className={`flex-1 text-center py-1 rounded text-[10px] font-mono transition-all ${codeLanguage === 'streamlit' ? 'bg-pink-600/20 text-pink-300 font-bold border border-pink-500/25' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Python Streamlit App
                  </button>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider flex items-center gap-1">
                    <FileCode className="h-3 w-3 text-emerald-500" />
                    {codeLanguage === 'streamlit' ? 'STREAMLIT APP (streamlit_app.py)' : 'TYPESCRIPT NODE SDK (@google/genai)'}
                  </span>
                  <button
                    onClick={() => triggerCopy(getGeneratedCode(), 'code_copy')}
                    className="text-[10px] bg-slate-900 hover:bg-slate-800 text-indigo-300 font-medium py-1 px-2.5 rounded border border-slate-850 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedIndex === 'code_copy' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied Code!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Code Block</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex-1 bg-slate-950 p-3 rounded-lg border border-slate-900 overflow-auto max-h-[350px]">
                  <pre className="text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
                    {getGeneratedCode()}
                  </pre>
                </div>
              </div>
            )}
          </div>
          
          {/* Helpful Tips Alert */}
          <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl flex gap-3">
            <Lightbulb className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-slate-200">Interactive Sync Workspace</p>
              <p className="text-slate-400 leading-normal mt-0.5">Editing system boundaries or draft text will automatically keep sandbox input templates in perfect sync.</p>
            </div>
          </div>
        </section>

        {/* L3: Dynamic Sandbox Testbed - 4/12 width */}
        <section className="xl:col-span-4 flex flex-col gap-4 bg-slate-900/20 border border-slate-900 rounded-xl p-5" id="column-sandbox">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-pink-400" />
              <h2 className="text-sm font-semibold text-slate-200">3. Interactive Sandbox</h2>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2.5 py-1 rounded">Stage III</span>
          </div>

          {/* Extracted Variables Block */}
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex-1 flex flex-col gap-4 min-h-[220px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-pink-400" />
                <span>Inject Variable Values</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{variables.length} Found</span>
            </div>

            {variables.length === 0 ? (
              <div className="flex-1 flex flex-col text-center items-center justify-center p-4 border border-dashed border-slate-850 rounded-xl">
                <Info className="h-7 w-7 text-slate-600 mb-2" />
                <p className="text-xs text-slate-400 font-medium">No Dynamic Variables Detected</p>
                <p className="text-[10px] text-slate-500 mt-0.5 max-w-[210px]">Use {"{{variable}}"} syntax in the draft prompt to define dynamic inputs.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 max-h-[300px] pr-1.5" id="variables-inputs-list">
                {variables.map((variable) => (
                  <div key={variable.name} className="flex flex-col gap-1.5 bg-slate-900/30 p-3 rounded-lg border border-slate-850">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-indigo-300 font-bold">{"{{"}{variable.name}{"}}"}</span>
                      <span className="text-[10px] text-slate-500 italic max-w-[150px] truncate">{variable.description}</span>
                    </div>
                    {variable.name.endsWith('text') || variable.name.endsWith('block') || variable.name.endsWith('transcript') ? (
                      <textarea
                        value={variableValues[variable.name] || ''}
                        onChange={(e) => setVariableValues({ ...variableValues, [variable.name]: e.target.value })}
                        className="w-full h-20 p-2 bg-slate-950 text-xs font-mono border border-slate-800 focus:border-indigo-600 rounded outline-none resize-none transition-all text-slate-200"
                        placeholder={`Type text value for {{${variable.name}}}...`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={variableValues[variable.name] || ''}
                        onChange={(e) => setVariableValues({ ...variableValues, [variable.name]: e.target.value })}
                        className="w-full p-2 bg-slate-950 text-xs font-mono border border-slate-800 focus:border-indigo-600 rounded outline-none transition-all text-slate-200"
                        placeholder={`Type short value...`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Input Emulation */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-300">Model Input Query (Simulated Message)</span>
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="What task would the final application user request? e.g. 'Analyze ticket #221'"
              className="w-full p-3 bg-slate-950/70 border border-slate-800 focus:border-pink-500 rounded-xl text-xs font-mono text-slate-200 outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Play Sandbox button */}
          <button
            onClick={handleRunSandbox}
            disabled={isRunningSandbox || !refinedPrompt}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 active:scale-[0.99] disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:transform-none text-xs font-semibold rounded-xl text-white shadow-xl shadow-indigo-600/10 active:shadow-none hover:shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            id="run-sandbox-btn"
          >
            {isRunningSandbox ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                <span>Injecting Variables & Evaluating...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 text-white fill-white" />
                <span>Test Refined Prompt inside Sandbox</span>
              </>
            )}
          </button>
        </section>

        </div> {/* Close columns-container-row */}
      </main>

      {/* Footer Branding Line */}
      <footer className="border-t border-slate-900 bg-slate-950 py-3.5 px-6 flex flex-col md:flex-row gap-3 items-center justify-between text-xs text-slate-500 font-mono" id="page-footer-nav">
        <p>© 2026 AI Prompt Studio | Dedicated Prompt Crafting Env</p>
        <p className="text-[10px] text-indigo-400">Powered by Gemini 3.5 & Google DeepMind</p>
      </footer>

      {showSaveBlueprintModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                💾 Save Blueprint to SQLite
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter a unique identifier name for this prompt snapshot to load it dynamically into your workspace during future iterations.
              </p>
            </div>
            
            <input
              type="text"
              placeholder="e.g. Fine-tuned Support Agent Configuration"
              value={promptBlueprintName}
              onChange={(e) => setPromptBlueprintName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 text-xs text-slate-200 border border-slate-800 rounded outline-none focus:border-indigo-500 font-sans"
              autoFocus
            />
            
            <div className="flex justify-end gap-2 text-xs font-sans">
              <button
                onClick={() => {
                  setShowSaveBlueprintModal(false);
                  setPromptBlueprintName('');
                }}
                type="button"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-755 text-slate-300 font-semibold rounded cursor-pointer border-0"
              >
                Cancel
              </button>
              <button
                onClick={savePromptToSql}
                disabled={!promptBlueprintName.trim()}
                type="button"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold rounded cursor-pointer border-0"
              >
                Commit to SQL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
