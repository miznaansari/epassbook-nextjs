'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Cpu,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  Play,
  Layers,
  Sparkles,
  ExternalLink,
  Code2,
  RefreshCw,
  Clock,
  CheckCircle2,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';

export default function McpManagementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // State
  const [apiKeys, setApiKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState('');
  const [selectedSnippetTab, setSelectedSnippetTab] = useState('cursor');
  const [activeTestKey, setActiveTestKey] = useState('');

  // Tool tester state
  const [selectedTool, setSelectedTool] = useState('get_dashboard_summary');
  const [toolArgsInput, setToolArgsInput] = useState('{\n  "filter": "current"\n}');
  const [testingTool, setTestingTool] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Status message
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Redirect if unauthenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch user API keys
  const fetchKeys = async () => {
    try {
      setLoadingKeys(true);
      const res = await fetch('/api/api-keys');
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.apiKeys || []);
        if (data.apiKeys?.length > 0 && !activeTestKey) {
          // Default test key if not set
          setActiveTestKey(data.apiKeys[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching API keys:', err);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchKeys();
    }
  }, [user]);

  // Create API Key
  const handleCreateKey = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setCreating(true);

    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim() || 'MCP Client Key',
          expiresDays: newKeyExpiry ? parseInt(newKeyExpiry) : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.apiKey) {
        setNewlyCreatedKey(data.apiKey);
        setNewKeyName('');
        setNewKeyExpiry('');
        await fetchKeys();
      } else {
        setErrorMsg(data.error || 'Failed to create API key.');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Delete API Key
  const handleDeleteKey = async (id, name) => {
    if (!window.confirm(`Are you sure you want to revoke and delete key "${name}"? Any connected MCP agent will immediately lose access.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/api-keys?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccessMsg(`Key "${name}" successfully deleted.`);
        setApiKeys((prev) => prev.filter((k) => k.id !== id));
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to delete API key.');
      }
    } catch (err) {
      setErrorMsg('Failed to delete key.');
    }
  };

  // Toggle Active status
  const handleToggleActive = async (id, currentStatus) => {
    try {
      const res = await fetch('/api/api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      if (res.ok) {
        setApiKeys((prev) =>
          prev.map((k) => (k.id === id ? { ...k, isActive: !currentStatus } : k))
        );
      }
    } catch (err) {
      console.error('Error toggling key status:', err);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = (text, type = 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } else {
      setCopiedSnippet(type);
      setTimeout(() => setCopiedSnippet(''), 2500);
    }
  };

  // Sample default args for tools
  const handleToolSelect = (tool) => {
    setSelectedTool(tool);
    switch (tool) {
      case 'get_dashboard_summary':
        setToolArgsInput('{\n  "filter": "current"\n}');
        break;
      case 'list_transactions':
        setToolArgsInput('{\n  "type": "ALL",\n  "limit": 10\n}');
        break;
      case 'create_transaction':
        setToolArgsInput('{\n  "title": "Coffee with friends",\n  "amount": 15.50,\n  "type": "SPENDING",\n  "description": "Logged via MCP Test"\n}');
        break;
      case 'get_monthly_balances':
        setToolArgsInput('{}');
        break;
      case 'list_stocks':
        setToolArgsInput('{}');
        break;
      case 'list_sips':
        setToolArgsInput('{}');
        break;
      case 'get_user_profile':
        setToolArgsInput('{}');
        break;
      default:
        setToolArgsInput('{}');
    }
  };

  // Run Test Tool
  const handleRunTest = async () => {
    setTestResult(null);
    setTestingTool(true);

    const activeKeyObj = newlyCreatedKey?.key
      ? newlyCreatedKey.key
      : null;

    // If user has a newly created raw key available, use it; otherwise warn
    if (!activeKeyObj) {
      setTestResult({
        isError: true,
        message: 'To execute live tests from the tester, please create a new key above and use the raw key, or paste your API key in the configuration.'
      });
      setTestingTool(false);
      return;
    }

    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolArgsInput);
      } catch (e) {
        setTestResult({ isError: true, message: 'Invalid JSON in arguments editor.' });
        setTestingTool(false);
        return;
      }

      const res = await fetch(`/api/mcp?api_key=${activeKeyObj}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test-' + Date.now(),
          method: 'tools/call',
          params: {
            name: selectedTool,
            arguments: parsedArgs,
          },
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ isError: true, message: err.message || 'Request failed' });
    } finally {
      setTestingTool(false);
    }
  };

  // Base domain origin
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
  const displayKey = newlyCreatedKey?.key || 'YOUR_API_KEY';
  const remoteMcpUrl = `${origin}/api/mcp?api_key=${displayKey}`;

  // Config Snippets
  const snippets = {
    cursor: JSON.stringify(
      {
        mcpServers: {
          passbook: {
            url: remoteMcpUrl,
            headers: {
              "x-api-key": displayKey
            }
          }
        }
      },
      null,
      2
    ),
    claude: JSON.stringify(
      {
        mcpServers: {
          passbook: {
            command: "npx",
            args: ["-y", "mcp-remote", remoteMcpUrl]
          }
        }
      },
      null,
      2
    ),
    windsurf: JSON.stringify(
      {
        mcpServers: {
          passbook: {
            serverUrl: remoteMcpUrl
          }
        }
      },
      null,
      2
    ),
    curl: `curl -X POST "${origin}/api/mcp?api_key=${displayKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_dashboard_summary",
      "arguments": { "filter": "current" }
    }
  }'`,
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-background text-foreground">
      <Navbar />

      <main className="flex-grow max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-16 space-y-8">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono tracking-wide uppercase bg-[#5E6AD2]/10 text-[#8B95F6] border border-[#5E6AD2]/20 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#6872D9]" />
                Remote MCP Server
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                v2024-11-05
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Cpu className="w-7 h-7 text-[#6872D9]" />
              Model Context Protocol (MCP) & API
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Connect Cursor, Claude Desktop, Windsurf, or custom AI agents directly to your Passbook financial records.
            </p>
          </div>

          {/* Quick Endpoint Badge */}
          <div className="flex items-center gap-2 bg-[#0a0a0c] border border-white/[0.08] rounded-xl px-3.5 py-2 shadow-sm">
            <Terminal className="w-4 h-4 text-[#8B95F6] shrink-0" />
            <code className="text-xs font-mono text-slate-300 truncate max-w-[240px] sm:max-w-xs">
              /api/mcp?api_key=...
            </code>
            <button
              onClick={() => copyToClipboard(`${origin}/api/mcp?api_key=${displayKey}`, 'url')}
              className="p-1 hover:bg-white/[0.06] rounded text-slate-400 hover:text-white transition cursor-pointer"
              title="Copy endpoint"
            >
              {copiedSnippet === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Newly Created Key Alert Modal */}
        <AnimatePresence>
          {newlyCreatedKey && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-5 rounded-2xl bg-[#0a0a0c] border border-[#5E6AD2]/40 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#8B95F6] font-semibold text-sm">
                  <Key className="w-4 h-4 text-[#6872D9]" />
                  API Key Created: <span className="text-white font-mono">{newlyCreatedKey.name}</span>
                </div>
                <button
                  onClick={() => setNewlyCreatedKey(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Dismiss
                </button>
              </div>

              <p className="text-xs text-amber-300/90 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Please copy your API key now. You will not be able to see this full key again!
              </p>

              <div className="flex items-center gap-2 bg-[#050506] border border-white/[0.08] rounded-xl p-2.5">
                <code className="flex-1 font-mono text-xs text-emerald-400 select-all overflow-x-auto">
                  {newlyCreatedKey.key}
                </code>
                <button
                  onClick={() => copyToClipboard(newlyCreatedKey.key, 'key')}
                  className="btn-linear-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0"
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Key
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section 1: API Keys Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Key Card */}
          <div className="lg:col-span-1 p-5 rounded-2xl bg-[#0a0a0c] border border-white/[0.06] shadow-linear-card space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Plus className="w-4 h-4 text-[#8B95F6]" />
              Generate API Key
            </div>
            <p className="text-slate-400 text-xs">
              Generate a secret API token to authenticate your remote MCP client or third-party agent.
            </p>

            <form onSubmit={handleCreateKey} className="space-y-3.5">
              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  Key Label / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cursor IDE, Claude Desktop"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050506] border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/30 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  Expiration (Optional)
                </label>
                <select
                  value={newKeyExpiry}
                  onChange={(e) => setNewKeyExpiry(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050506] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/30 transition font-mono"
                >
                  <option value="" className="bg-[#050506]">Never Expires</option>
                  <option value="30" className="bg-[#050506]">30 Days</option>
                  <option value="60" className="bg-[#050506]">60 Days</option>
                  <option value="90" className="bg-[#050506]">90 Days</option>
                  <option value="365" className="bg-[#050506]">1 Year</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="btn-linear-primary w-full py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {creating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" /> Generate Token
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Keys List */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0a0a0c] border border-white/[0.06] shadow-linear-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Active API Keys ({apiKeys.length})
              </div>
              <button
                onClick={fetchKeys}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition cursor-pointer"
                title="Refresh keys"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingKeys ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#5E6AD2]/20 border-t-[#5E6AD2] rounded-full animate-spin"></div>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No API keys generated yet. Click "Generate Token" to create one.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {apiKeys.map((k) => (
                  <div
                    key={k.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      k.isActive
                        ? 'bg-[#050506]/80 border-white/[0.06] hover:border-[#5E6AD2]/30'
                        : 'bg-rose-950/10 border-rose-500/20 opacity-60'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white truncate">{k.name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                            k.isActive
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {k.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span>{k.prefix}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {k.lastUsedAt
                            ? `Used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                            : 'Never used'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleToggleActive(k.id, k.isActive)}
                        className="px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-[10px] font-mono rounded-lg transition cursor-pointer"
                      >
                        {k.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDeleteKey(k.id, k.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                        title="Delete key"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: AI Client Configuration Generator */}
        <div className="p-5 rounded-2xl bg-[#0a0a0c] border border-white/[0.06] shadow-linear-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Code2 className="w-4 h-4 text-[#8B95F6]" />
              1-Click AI Client Configuration
            </div>
            <div className="flex items-center gap-1 bg-[#050506] p-1 rounded-xl border border-white/[0.06]">
              {['cursor', 'claude', 'windsurf', 'curl'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedSnippetTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition cursor-pointer ${
                    selectedSnippetTab === tab
                      ? 'bg-[#5E6AD2] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'claude' ? 'Claude Desktop' : tab === 'curl' ? 'cURL / Test' : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="relative bg-[#050506] rounded-xl p-4 border border-white/[0.06] font-mono text-xs text-slate-300 overflow-x-auto">
            <button
              onClick={() => copyToClipboard(snippets[selectedSnippetTab], selectedSnippetTab)}
              className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-white text-[11px] rounded-lg transition cursor-pointer font-mono"
            >
              {copiedSnippet === selectedSnippetTab ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy Config
                </>
              )}
            </button>
            <pre className="pr-16">{snippets[selectedSnippetTab]}</pre>
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed space-y-1 font-mono">
            {selectedSnippetTab === 'cursor' && (
              <p>
                <strong>Setup in Cursor:</strong> Open Cursor Settings &gt; MCP &gt; Add New MCP Server. Name it <code className="text-[#8B95F6]">passbook</code>, set Type to <code className="text-[#8B95F6]">sse</code> or paste the JSON above in your <code className="text-[#8B95F6]">.cursor/mcp.json</code>.
              </p>
            )}
            {selectedSnippetTab === 'claude' && (
              <p>
                <strong>Setup in Claude Desktop:</strong> Add this block to your <code className="text-[#8B95F6]">claude_desktop_config.json</code> under <code className="text-[#8B95F6]">mcpServers</code>. Uses <code className="text-emerald-400">mcp-remote</code> proxy to bridge SSE directly.
              </p>
            )}
            {selectedSnippetTab === 'windsurf' && (
              <p>
                <strong>Setup in Windsurf:</strong> Add to your <code className="text-[#8B95F6]">mcp_config.json</code> to give Cascade direct context over your Passbook accounts.
              </p>
            )}
            {selectedSnippetTab === 'curl' && (
              <p>
                <strong>Direct JSON-RPC 2.0 Test:</strong> Run this command in any terminal to test the remote endpoint directly via HTTP POST.
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Live MCP Tool Tester */}
        <div className="p-5 rounded-2xl bg-[#0a0a0c] border border-white/[0.06] shadow-linear-card space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Play className="w-4 h-4 text-emerald-400" />
            Interactive MCP Tool Tester
          </div>
          <p className="text-slate-400 text-xs">
            Test and verify tool execution responses right in the browser using the remote protocol.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tool selection and parameters */}
            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  Select MCP Tool
                </label>
                <select
                  value={selectedTool}
                  onChange={(e) => handleToolSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050506] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/30 transition font-mono"
                >
                  <option value="get_dashboard_summary" className="bg-[#050506]">get_dashboard_summary</option>
                  <option value="list_transactions" className="bg-[#050506]">list_transactions</option>
                  <option value="create_transaction" className="bg-[#050506]">create_transaction</option>
                  <option value="get_monthly_balances" className="bg-[#050506]">get_monthly_balances</option>
                  <option value="list_stocks" className="bg-[#050506]">list_stocks</option>
                  <option value="list_sips" className="bg-[#050506]">list_sips</option>
                  <option value="get_user_profile" className="bg-[#050506]">get_user_profile</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  Tool Arguments (JSON)
                </label>
                <textarea
                  rows={5}
                  value={toolArgsInput}
                  onChange={(e) => setToolArgsInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050506] border border-white/[0.08] rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2]/30 transition"
                />
              </div>

              <button
                onClick={handleRunTest}
                disabled={testingTool}
                className="btn-linear-primary w-full py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {testingTool ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" /> Execute Tool via MCP
                  </>
                )}
              </button>
            </div>

            {/* Test output viewer */}
            <div className="space-y-1">
              <label className="block text-slate-300 text-[11px] font-medium mb-1">
                JSON-RPC 2.0 Response
              </label>
              <div className="h-[200px] bg-[#050506] rounded-xl p-3 border border-white/[0.08] font-mono text-[11px] text-slate-300 overflow-auto">
                {testResult ? (
                  <pre>{JSON.stringify(testResult, null, 2)}</pre>
                ) : (
                  <span className="text-slate-500 italic">
                    Execute a tool above to view live JSON-RPC result...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
