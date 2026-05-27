import streamlit as st
import os
import re
import json
from google import genai
from google.genai import types

# ---------------------------------------------------------
# Streamlit UI Page Styling & Layout Configuration
# ---------------------------------------------------------
st.set_page_config(
    page_title="AI Prompt Studio - Enterprise Python Sandbox",
    page_icon="✨",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Brand Color Palette & UI Enhancements
st.markdown("""
<style>
    /* Styling for the decorative top container */
    .brand-container {
        background: linear-gradient(135deg, #312e81 0%, #4338ca 35%, #6d28d9 70%, #be185d 100%);
        padding: 2rem;
        border-radius: 16px;
        color: white;
        margin-bottom: 2rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 10px 30px -10px rgba(79, 70, 229, 0.3);
    }
    .brand-title {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        font-weight: 800;
        letter-spacing: -0.025em;
        margin: 0;
        font-size: 2.5rem;
    }
    .brand-subtitle {
        color: #e0e7ff;
        font-size: 1.05rem;
        margin-top: 0.5rem;
        opacity: 0.9;
    }
    /* Subtle status indicators */
    .status-pill {
        background-color: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-family: monospace;
        font-weight: 600;
    }
    .badge-gray {
        background-color: rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.7rem;
    }
    .notebook-box {
        background-color: #0b0f19;
        border: 1px dashed #1e293b;
        border-radius: 8px;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
    }
</style>
""", unsafe_allow_code=True)

# ---------------------------------------------------------
# Session State Management for Stateful Prompts & Presets
# ---------------------------------------------------------
PRESETS = [
    {
        "id": "json-extractor",
        "title": "📋 Customer Support Details Extractor",
        "category": "Data Structuring",
        "draft": "Extract all details from this support ticket.\nFind the customer name, order number, critical issues mentioned, and urgency level.\nFormat the output as a clean JSON.\n\nTicket source text:\n{{ticket_text}}\nUrgency rule: If order is delayed, set {{urgency_override}} accordingly.",
        "tone": "clinical",
        "language": "English"
    },
    {
        "id": "email-composer",
        "title": "📧 Executive B2B Outreach Writer",
        "category": "Corporate Messaging",
        "draft": "Help me write an email outreach. The reader is {{company_name}} executive who leads the {{department}} department.\nWe want to introduce our solution for {{pain_point}} and propose a 10-minute slot on {{meeting_day}}.\nMake it crisp and authoritative.",
        "tone": "professional",
        "language": "English"
    },
    {
        "id": "code-reviewer",
        "title": "💻 Security & Algorithmic Auditor",
        "category": "Engineering Utilities",
        "draft": "Review this custom script for security vulnerabilities and algorithmic bottlenecks.\nCode snippet:\n{{code_block}}\n\nFocus specifically on {{vulnerability_type}} concerns and recommend refactoring.",
        "tone": "technical",
        "language": "English"
    },
    {
        "id": "creative-story",
        "title": "✍️ Atmospheric Narrative Story Architect",
        "category": "Creative Arts",
        "draft": "Write a gripping mystery prologue where a protagonist named {{detective}} investigates a locked-room scene in {{location}}.\nTheme revolves around a missing {{target_item}}.\nSet the mood to {{atmosphere}}.",
        "tone": "creative",
        "language": "English"
    }
]

# Initialize Session states safely
if "refined_prompt" not in st.session_state:
    st.session_state.refined_prompt = """# Role
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
- calculatedUrgency (enum: "low", "medium", "high")"""

if "draft_prompt" not in st.session_state:
    st.session_state.draft_prompt = PRESETS[0]["draft"]

if "draft_tone" not in st.session_state:
    st.session_state.draft_tone = PRESETS[0]["tone"]

if "draft_language" not in st.session_state:
    st.session_state.draft_language = PRESETS[0]["language"]

if "sandbox_runs" not in st.session_state:
    st.session_state.sandbox_runs = []

if "uploaded_notebook_data" not in st.session_state:
    try:
        if os.path.exists('kaggle_feedback_sentiment.ipynb'):
            with open('kaggle_feedback_sentiment.ipynb', 'r', encoding='utf-8') as f:
                st.session_state.uploaded_notebook_data = json.load(f)
        else:
            st.session_state.uploaded_notebook_data = None
    except Exception as e:
        st.session_state.uploaded_notebook_data = None

if "kaggle_csv_rows" not in st.session_state:
    st.session_state.kaggle_csv_rows = []
    try:
        if os.path.exists('customer_support_feedback.csv'):
            import csv
            with open('customer_support_feedback.csv', mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                st.session_state.kaggle_csv_rows = list(reader)
    except Exception as e:
        pass

# Sample Notebook default for preview demo if local file is missing
sample_notebook_json = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# Kaggle Dataset Exploration: Customer Support Reviews\n",
                "This notebook parses real customer dispute texts. Below, we'll configure dynamic templates."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": 1,
            "metadata": {},
            "outputs": [],
            "source": [
                "# Define raw review sample template variable for test sandboxing\n",
                "sample_review_data = \"\"\"Ref: #7743. Damage occurred during freight delivery on Sunday night. Please replace the item.\"\"\"\n",
                "print(len(sample_review_data))"
            ]
        }
    ],
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "name": "python3"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 2
}

# ---------------------------------------------------------
# Sidebar Configuration Panel
# ---------------------------------------------------------
st.sidebar.title("🛠️ Project Parameters")

# Check and retrieve local environments
api_key = st.sidebar.text_input(
    "GEMINI_API_KEY",
    type="password",
    value=os.environ.get("GEMINI_API_KEY", ""),
    placeholder="AI Studio key",
    help="Default fallback loads automatically from AI Studio Secrets. Enter custom key to override."
)

st.sidebar.write("---")
st.sidebar.subheader("🎯 Model Execution Options")

model_choice = st.sidebar.selectbox(
    "Gemini Model Choice",
    options=["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"],
    index=0,
    help="We strongly recommend gemini-2.5-flash for real-time prompt structuring tasks."
)

temperature_value = st.sidebar.slider(
    "Temperature",
    min_value=0.0,
    max_value=2.0,
    value=0.7,
    step=0.1,
    help="Higher values trigger more exploratory output; lower values maintain consistent accuracy."
)

st.sidebar.write("---")
st.sidebar.subheader("🌍 Connected Node Status")
st.sidebar.markdown("""
<div class="status-box">
    <span class="status-pill">● Engine Active</span>
    <p style="margin-top: 5px; font-size: 0.8rem; color: #94a3b8;">Running sandboxed server processes with Google GenAI SDK support.</p>
</div>
""", unsafe_allow_code=True)

# ---------------------------------------------------------
# Application Branding & Visual Banner
# ---------------------------------------------------------
st.markdown("""
<div class="brand-container">
    <div class="brand-title">✨ AI Prompt Studio</div>
    <div class="brand-subtitle">Translate dynamic drafts & Kaggle .ipynb notebooks into structured System Prompts for Gemini & Python</div>
</div>
""", unsafe_allow_code=True)


# ---------------------------------------------------------
# Kaggle Jupyter Notebook (.ipynb) Extractor Sub-Widget
# ---------------------------------------------------------
st.markdown("### 📓 Jupyter Notebook & Kaggle CSV Dataset Extractor")
st.markdown(
    "Analyze your Kaggle dataset resources directly from the playground workspace. Toggle between Jupyter Notebook cells and CSV rows to inject raw data triggers."
)

tab_nb, tab_csv = st.tabs(["📓 Notebook Cells", "📊 Kaggle Dataset CSV Rows"])

with tab_nb:
    notebook_file = st.file_uploader(
        "Upload Kaggle / Jupyter Notebook (.ipynb)", 
        type=["ipynb"],
        help="Select or drag/drop any local notebook to inspect its content values."
    )

    # Parse uploaded file or provide pre-packaged fallbacks
    selected_notebook_source = None
    if notebook_file is not None:
        try:
            notebook_data = json.load(notebook_file)
            st.session_state.uploaded_notebook_data = notebook_data
            st.success(f"Successfully processed raw cells inside '{notebook_file.name}'!")
        except Exception as e:
            st.error(f"Failed to parse target notebook json: {str(e)}")

    # Notebook statistics indicators & selection
    if st.session_state.uploaded_notebook_data:
        nb = st.session_state.uploaded_notebook_data
        cells = nb.get("cells", [])
        
        code_cells_raw = [c for c in cells if c.get("cell_type") == "code"]
        markdown_cells_raw = [c for c in cells if c.get("cell_type") == "markdown"]
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Extracted Cells", len(cells))
        with col2:
            st.metric("Code Blocks Found", len(code_cells_raw))
        with col3:
            st.metric("Markdown Annotations", len(markdown_cells_raw))
            
        st.markdown("##### Filter and extract variables from the Notebook:")
        
        extracted_sources = []
        for idx, cell in enumerate(cells[:15]):  # limit to first 15 for safety
            cell_type = cell.get("cell_type", "unknown")
            source = "".join(cell.get("source", []))
            if source.strip():
                extracted_sources.append({
                    "label": f"[{cell_type.upper()}] Cell #{idx+1} - {source[:50].strip()}...",
                    "full_text": source,
                    "type": cell_type
                })
                
        if extracted_sources:
            selected_cell_index = st.selectbox(
                "Select individual Notebook block to inspect:",
                options=range(len(extracted_sources)),
                format_func=lambda index: extracted_sources[index]["label"],
                key="sb_notebook_cell_sel"
            )
            selected_cell = extracted_sources[selected_cell_index]
            
            # Display the contents of selected block in code preview
            st.markdown(f"**Selected Block Preview ({selected_cell['type']}):**")
            st.code(selected_cell["full_text"], language="python" if selected_cell["type"] == "code" else "markdown")
            
            # Action Buttons to map cell directly into Prompt Draft workspace or Variable Values!
            col_act1, col_act2 = st.columns(2)
            with col_act1:
                if st.button("📥 Inject Cell Content as Prompt Draft", key="btn_inject_nb"):
                    st.session_state.draft_prompt = selected_cell["full_text"]
                    st.toast("Updated prompt draft from notebook cell!", icon="✅")
                    st.rerun()
            with col_act2:
                st.info("💡 You can copy-paste cell parameters directly relative to your dynamic fields.")

with tab_csv:
    if st.session_state.kaggle_csv_rows:
        st.success("Loaded customer_support_feedback.csv successfully from Workspace.")
        
        import pandas as pd
        csv_df = pd.DataFrame(st.session_state.kaggle_csv_rows)
        st.dataframe(csv_df, use_container_width=True)
        
        selected_row_idx = st.selectbox(
            "Select CSV record to inject as Sandbox variables",
            options=range(len(csv_df)),
            format_func=lambda idx: f"Row #{idx+1} - Customer: {csv_df.iloc[idx].get('customer_name', 'Unknown')}",
            key="sb_csv_row_sel"
        )
        
        target_row = csv_df.iloc[selected_row_idx]
        st.markdown("**Selected customer review content:**")
        st.info(target_row.get("ticket_text", "No ticket text"))
        
        if st.button("🚀 Load Selected Ticket Text to Sandbox Values", type="primary", key="btn_inject_csv"):
            st.session_state.sb_ticket_text = target_row.get("ticket_text", "")
            if "customer_name" in target_row:
                st.session_state.sb_customer_name = target_row.get("customer_name", "")
            st.toast("Loaded ticket text into Sandbox inputs!", icon="🔥")
            st.rerun()
    else:
        st.warning("No local CSV dataset found at 'customer_support_feedback.csv'")

st.write("---")

# ---------------------------------------------------------
# Core Main Grid Layout
# ---------------------------------------------------------
col_left, col_right = st.columns([1, 1], gap="large")

# =========================================================
# LEFT COLUMN: Prompt Design Workspace (Stage 1 & 2)
# =========================================================
with col_left:
    st.markdown("### 🧱 Step 1: Design Prompt Draft")
    
    # Preset Prompt Jumpstart Loader
    preset_choice = st.selectbox(
        "⚡ Jumpstart with Blueprint Presets", 
        options=[preset["title"] for preset in PRESETS],
        index=0
    )
    
    # Process Preset Selection
    selected_preset = next(p for p in PRESETS if p["title"] == preset_choice)
    if st.button("📥 Load Blueprint Parameters"):
        st.session_state.draft_prompt = selected_preset["draft"]
        st.session_state.draft_tone = selected_preset["tone"]
        st.session_state.draft_language = selected_preset["language"]
        st.toast(f"Loaded blueprint '{selected_preset['title']}' loaded into edit state!", icon="📝")
        st.rerun()

    # Draft Workstation
    draft_input = st.text_area(
        "Raw Prompt Draft Concept",
        value=st.session_state.draft_prompt,
        height=180,
        placeholder="Paste your quick draft notes here... Use {{variable_name}} boundaries to insert dynamic fields later.",
        help="This workspace allows you to draft your foundational ideas."
    )
    # Stash edits back to state
    st.session_state.draft_prompt = draft_input

    # Tone & Translation Config Grid
    col_tone, col_lang = st.columns(2)
    with col_tone:
        tone_value = st.selectbox(
            "Selected Persona Tone",
            options=["professional", "creative", "clinical", "technical", "casual"],
            index=["professional", "creative", "clinical", "technical", "casual"].index(st.session_state.draft_tone)
        )
        st.session_state.draft_tone = tone_value
    with col_lang:
        lang_value = st.selectbox(
            "Target Prompt Language",
            options=["English", "Spanish", "French", "German", "Japanese", "Hindi"],
            index=["English", "Spanish", "French", "German", "Japanese", "Hindi"].index(st.session_state.draft_language)
        )
        st.session_state.draft_language = lang_value

    st.write("")

    # ----------------------------------------------------
    # AI Structuring Action
    # ----------------------------------------------------
    if st.button("✨ Auto-Refine & Structure Prompt", type="primary", use_container_width=True):
        if not api_key:
            st.error("🔑 API Key is required to refine drafts. Please configure GEMINI_API_KEY in the sidebar.")
        elif not draft_input.strip():
            st.warning("Draft prompt is currently empty. Please type some goals or load a blueprint preset.")
        else:
            with st.spinner("Analyzing rules, generating layout schemas, and invoking Gemini..."):
                try:
                    # Initialize named SDK client
                    client = genai.Client(api_key=api_key)
                    
                    systemInstruction = f"""You are a legendary prompt engineer. Your job is to take a draft prompt and refine it into a highly effective, production-ready structured system prompt for large language models.
                    
                    CRITICAL INSTRUCTIONS:
                    - Add crisp organization and sections, such as "Role", "Primary Mission", "Input Structure / Variables List", "Output Constraints & Schema", and "Few-Shot Examples" (only if beneficial).
                    - Ensure all dynamic variables (like {{{{variableName}}}}) present in the draft are explicitly kept and documented in the refined prompt structure. Do not change variable names.
                    - Refine the instructions for tone: "{tone_value}".
                    - Translate and output the final prompt text in this language: "{lang_value}".
                    - Output ONLY the robust system prompt in Markdown format. Do not write any greetings, conversational meta-commentary, or introductory remarks like "Sure, here is your enhanced prompt...". Just start immediately with the markdown prompt content."""

                    response = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=f"Draft Prompt:\n\n{draft_input}",
                        config=types.GenerateContentConfig(
                            system_instruction=systemInstruction,
                            temperature=0.6,
                        )
                    )
                    
                    if response.text:
                        st.session_state.refined_prompt = response.text
                        st.success("🎉 Refinement Complete! The compiled structure has been sent to the workbench tab below.")
                        st.rerun()
                    else:
                        st.error("Gemini returned an empty refinement. Please retry.")
                except Exception as e:
                    st.error("❌ Refinement API Error")
                    st.code(str(e))

    st.write("---")

    # Workbench: Editable Compiled Instruction
    st.markdown("### 🧬 Step 2: Refined Prompt Workbench")
    st.markdown("This is the exact structured compilation used as your System Instructions payload:")
    
    refined_input = st.text_area(
        "Active System Instruction Template",
        value=st.session_state.refined_prompt,
        height=320,
        help="Edit this system guide directly if you want to tweak instructions, constraints, or schemas."
    )
    st.session_state.refined_prompt = refined_input


# =========================================================
# RIGHT COLUMN: Interactive Sandbox & Compilation (Stage 3)
# =========================================================
with col_right:
    st.markdown("### 🎛️ Step 3: Interactive Sandbox Variables")
    
    # Automated brackets parsing from System Prompt
    parsed_variables = sorted(list(set(re.findall(r"{{\s*([a-zA-Z0-9_]+)\s*}}", st.session_state.refined_prompt))))
    
    substitutions = {}
    
    if not parsed_variables:
        st.info("💡 No template arguments detected in compiled instructions. Use double curly brackets like `{{parameter}}` to enable live substitution form fields.")
    else:
        st.markdown("Assign custom values into dynamic brackets in real-time:")
        for var in parsed_variables:
            # Smart default guesses
            fallback = "Required Entry value"
            if "text" in var or "block" in var or "transcript" in var or "prompt" in var or "code" in var:
                fallback = "My order #9941 has not arrived. I need this package by Friday for my anniversary or I will cancel immediately, please check into this process!"
                substitutions[var] = st.text_area(f"Value for {{{{ {var} }}}}", value=fallback, key=f"sb_{var}", height=100)
            elif "override" in var or "urgency" in var:
                fallback = "Immediate"
                substitutions[var] = st.text_input(f"Value for {{{{ {var} }}}}", value=fallback, key=f"sb_{var}")
            else:
                substitutions[var] = st.text_input(f"Value for {{{{ {var} }}}}", value=var.replace('_', ' ').capitalize(), key=f"sb_{var}")

    st.write("")
    
    # Prompt Test Trigger Input
    st.markdown("#### 💬 Emulated User Action Input")
    simulated_user_query = st.text_input(
        "Simulated Dialogue Message",
        value="Analyze support request with the variables schema.",
        help="This corresponds to the active conversational content message sent directly to Gemini."
    )

    # ----------------------------------------------------
    # Sandbox Sandbox Trigger
    # ----------------------------------------------------
    if st.button("🚀 Run Test Sandbox Instance", type="primary", use_container_width=True):
        if not api_key:
            st.error("🔑 API Key is required to launch sandbox executions. Please provide your GEMINI_API_KEY.")
        else:
            with st.spinner("Parsing inputs, mapping substitutions matrix, and running response sandbox..."):
                try:
                    # 1. Setup client
                    client = genai.Client(api_key=api_key)
                    
                    # 2. Re-compile System Prompt substituting the active variables
                    compiled_instructions = st.session_state.refined_prompt
                    for key, val in substitutions.items():
                        # Support robust replacement with any inside whitespace braces
                        compiled_instructions = re.sub(
                            r"{{\s*" + re.escape(key) + r"\s*}}",
                            str(val),
                            compiled_instructions
                        )
                    
                    # 3. Call execution
                    response = client.models.generate_content(
                        model=model_choice,
                        contents=simulated_user_query,
                        config=types.GenerateContentConfig(
                            system_instruction=compiled_instructions,
                            temperature=temperature_value,
                        )
                    )
                    
                    # 4. Save results stateful
                    st.session_state.sandbox_runs.insert(0, {
                        "prompt": compiled_instructions,
                        "query": simulated_user_query,
                        "output": response.text or "Empty workspace logs.",
                        "model": model_choice
                    })
                    st.toast("Success: Sandbox execution loaded!", icon="✅")
                except Exception as e:
                    st.error("❌ Execution Error")
                    st.code(str(e))

    # ----------------------------------------------------
    # Tabs: Output vs Code Exporters
    # ----------------------------------------------------
    st.write("---")
    tab_sandbox, tab_python, tab_sub_view = st.tabs([
        "🏁 Sandbox Response Log", 
        "🐍 Python SDK Export", 
        "🔍 Full Compiled Prompt Preview"
    ])

    with tab_sandbox:
        if not st.session_state.sandbox_runs:
            st.markdown("<p style='color: #64748b; font-style: italic;'>No sandbox iterations run yet. Fill dynamic values above and click 'Run Test Sandbox Instance'.</p>", unsafe_allow_code=True)
        else:
            latest_run = st.session_state.sandbox_runs[0]
            st.markdown(f"**🟢 Output via `{latest_run['model']}`:**")
            st.markdown(latest_run["output"])
            
            # Historic Expanders for previous runs during active sessions
            if len(st.session_state.sandbox_runs) > 1:
                with st.expander("📚 View Session History Runs"):
                    for idx, run in enumerate(st.session_state.sandbox_runs[1:]):
                        st.markdown(f"**Iteration -{idx+1} ({run['model']})**")
                        st.text(f"Query: {run['query']}")
                        st.markdown(run["output"])
                        st.write("---")

    with tab_python:
        st.markdown("Copy this dynamic Python template straight to your deployment project:")
        
        # Substituted Variables JSON mockup
        formatted_variables_dict = {k: v for k, v in substitutions.items()} if substitutions else {"param_name": "value_mock"}
        
        generated_python_code = f"""import os
from google import genai
from google.genai import types
import re

# Initialize utilizing modern google-genai library
# Falls back directly to GEMINI_API_KEY environment variable.
client = genai.Client()

# System Instruction structure designed inside prompt workspace
system_blueprint = \"\"\"{st.session_state.refined_prompt}\"\"\"

# App variables to map dynamically
variables_map = {formatted_variables_dict}

# Build fully substituted system instruction prompt
substituted_prompt = system_blueprint
for key, value in variables_map.items():
    substituted_prompt = re.sub(r"{{\\s*" + re.escape(key) + r"\\s*}}", str(value), substituted_prompt)

# Execute interactive contents using recommended model configuration
response = client.models.generate_content(
    model="{model_choice}",
    contents="{simulated_user_query}",
    config=types.GenerateContentConfig(
        system_instruction=substituted_prompt,
        temperature={temperature_value},
    )
)

print(\"Result Output:\\n\", response.text)
"""
        st.code(generated_python_code, language="python")

    with tab_sub_view:
        # Side-by-side template and fully substituted preview
        st.markdown("**Structured System Template:**")
        st.code(st.session_state.refined_prompt, language="markdown")
        
        compiled_preview = st.session_state.refined_prompt
        for key, val in substitutions.items():
            compiled_preview = re.sub(r"{{\s*" + re.escape(key) + r"\s*}}", f"**[{val}]**", compiled_preview)
            
        st.markdown("**Substituted Preview Highlighted:**")
        st.markdown(compiled_preview)

# ---------------------------------------------------------
# Footer Credentials & Production Deploy Support
# ---------------------------------------------------------
st.write("")
st.write("---")
st.markdown("""
<div style="font-family: monospace; font-size: 0.75rem; color: #64748b; text-align: center; margin-top: 3rem;">
    <span>🎨 Built with Streamlit 1.30+ | Named telemetry standard validation</span><br/>
    <span>Licensed Apache-2.0. Powered securely. Use GEMINI_API_KEY env for cloud deployments.</span>
</div>
""", unsafe_allow_code=True)
