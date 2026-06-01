// ============================================================
//  tools.js — Tool list for the ToolSidebar panel
// ============================================================
//  This file is SEPARATE from Skills.jsx (the + button).
//  Changes here only affect the sidebar tool list.
//
//  HOW TO ADD A TOOL:
//    1. Add an entry to TOOLS[]
//    2. Add its backendKey to the matching category in ToolSidebar.jsx → CATEGORIES
//    3. Optionally add its icon to TOOL_ICONS in ToolSidebar.jsx
// ============================================================

export const TOOLS = [
  {
    name: "Deep Search",
    backendKey: "deep_search",
    description: "Search the web for up-to-date info and cited sources.",
    suggestions: [
      "Search for the latest AI news",
      "Look up Python best practices",
      "What is quantum computing?",
      "Find info about climate change",
    ],
  },

  {
    name: "Calculator",
    backendKey: "calculate",
    description: "Perform mathematical calculations and evaluate expressions.",
    suggestions: [
      "Compute exp(2)",
      "What is sqrt(144)?",
      "Calculate sin(45) + sqrt(16)",
      "Find the value of pi * 10",
      "How much is 100 USD in TRY",
      "Convert 10 km to miles",
    ],
  },

  {
    name: "Get Weather",
    backendKey: "get_current_weather",
    description: "Get the current weather for a given location.",
    suggestions: [
      "Check the current weather in Istanbul",
      "What is the weather today?",
      "Is it raining in Istanbul right now?",
    ],
  },

  {
    name: "Send Email",
    backendKey: "send_email_gmail",
    description: "Send an email using Gmail, with optional attachment.",
    suggestions: [
      "Send an email",
      "Email a message to someone",
      "Send a file via email",
    ],
  },

  {
    name: "Write File",
    backendKey: "write_file",
    description: "Create or save content to a file on the server.",
    suggestions: [
      "Write this note into a file",
      "Create a text file",
      "Create a PDF file",
      "Save this information into a file",
    ],
  },

  {
    name: "System Commands",
    backendKey: "system_commands_windows",
    description: "Retrieve system or network information from Windows.",
    suggestions: [
      "Show my system information",
      "Check my network status",
      "What is my public IP?",
      "Show active network connections",
      "Display my IP configuration",
    ],
  },

  {
    name: "Daily Planner",
    backendKey: "manage_planner",
    description: "Plan, track, and prioritize your daily tasks conversationally.",
    suggestions: [
      "What do I have on my list today?",
      "I need to finish chapter 2 and clean my room",
      "Add studying networking to my tasks",
      "What should I focus on first?",
      "Mark my first task as done",
    ],
  },

  {
    name: "Secret Word",
    backendKey: "get_secret_word",
    description: "Retrieve a hidden or secret value for testing or fun.",
    suggestions: [
      "Reveal the secret word",
      "Give me the hidden word",
    ],
  },
];
