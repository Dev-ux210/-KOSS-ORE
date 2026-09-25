"use client";

import * as React from "react";
import {
  Sparkles,
  Server,
  Key,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Cpu,
  RefreshCw
} from "lucide-react";
import {
  fetchSettings,
  updateSettings,
  fetchProviderStatus,
  AppSettings,
  ProviderStatus
} from "@/lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SettingsModal({ isOpen, onClose, onSaved }: SettingsModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<ProviderStatus | null>(null);
  const [settings, setSettings] = React.useState<AppSettings>({
    provider: "ollama",
    ollama_base_url: "http://127.0.0.1:11434",
    ollama_chat_model: "llama3",
    ollama_embed_model: "nomic-embed-text",
    gemini_api_key: "",
    gemini_chat_model: "gemini-1.5-flash",
    gemini_embed_model: "text-embedding-004",
    openai_api_key: "",
    openai_base_url: "https://api.openai.com/v1",
    openai_chat_model: "gpt-4o-mini",
    openai_embed_model: "text-embedding-3-small",
  });
  const [selectedProvider, setSelectedProvider] = React.useState<string>("ollama");
  const [geminiKeyInput, setGeminiKeyInput] = React.useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = React.useState("");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [fetchedSettings, fetchedStatus] = await Promise.all([
        fetchSettings(),
        fetchProviderStatus(),
      ]);
      setSettings(fetchedSettings);
      setSelectedProvider(fetchedSettings.provider || "ollama");
      setStatus(fetchedStatus);
    } catch (err: any) {
      setFeedback({ type: "error", message: `Failed to load settings: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload: Partial<AppSettings> = {
        provider: selectedProvider,
      };
      if (selectedProvider === "gemini") {
        if (geminiKeyInput.trim()) {
          payload.gemini_api_key = geminiKeyInput.trim();
        }
        payload.gemini_chat_model = settings.gemini_chat_model;
      } else if (selectedProvider === "openai") {
        if (openaiKeyInput.trim()) {
          payload.openai_api_key = openaiKeyInput.trim();
        }
        payload.openai_base_url = settings.openai_base_url;
        payload.openai_chat_model = settings.openai_chat_model;
      } else {
        payload.ollama_base_url = settings.ollama_base_url;
        payload.ollama_chat_model = settings.ollama_chat_model;
        payload.ollama_embed_model = settings.ollama_embed_model;
      }

      const res = await updateSettings(payload);
      setStatus(res.status);
      setSettings(res.settings);
      setGeminiKeyInput("");
      setOpenaiKeyInput("");
      setFeedback({
        type: res.status.ready ? "success" : "error",
        message: res.status.ready
          ? "Settings saved successfully! AI engine is ready."
          : `Saved, but ${res.status.message}`,
      });
      if (onSaved) onSaved();
    } catch (err: any) {
      setFeedback({ type: "error", message: `Failed to save: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-6 text-zinc-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">AI Engine Setup</h2>
              <p className="text-xs text-zinc-400">Configure your local or cloud LLM provider</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2.5 ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-amber-500/10 border border-amber-500/20 text-amber-300"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Provider selection tabs */}
        <div className="mt-5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-2">
            Select Provider
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedProvider("ollama")}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                selectedProvider === "ollama"
                  ? "bg-violet-600/15 border-violet-500 text-violet-200 shadow-sm"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              <Server className="h-5 w-5 mb-1.5" />
              <span>Ollama (Local)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProvider("gemini")}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                selectedProvider === "gemini"
                  ? "bg-violet-600/15 border-violet-500 text-violet-200 shadow-sm"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              <Sparkles className="h-5 w-5 mb-1.5" />
              <span>Google Gemini</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedProvider("openai")}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                selectedProvider === "openai"
                  ? "bg-violet-600/15 border-violet-500 text-violet-200 shadow-sm"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              }`}
            >
              <Key className="h-5 w-5 mb-1.5" />
              <span>OpenAI / Groq</span>
            </button>
          </div>
        </div>

        {/* Dynamic Provider Config Body */}
        <div className="mt-5 space-y-4">
          {selectedProvider === "ollama" && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300">Ollama Daemon Status:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${
                    status?.ollama.available
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      status?.ollama.available ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                  {status?.ollama.available ? "Connected" : "Not Running"}
                </span>
              </div>

              {!status?.ollama.available && (
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 space-y-2">
                  <p>
                    Ollama was not detected on <code>127.0.0.1:11434</code>. To use local offline AI:
                  </p>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://ollama.com/download"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-violet-400 hover:underline font-medium"
                    >
                      Download Ollama <ExternalLink className="h-3 w-3" />
                    </a>
                    <span>or switch to Google Gemini above for instant zero-setup use.</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Ollama Host URL</label>
                <input
                  type="text"
                  value={settings.ollama_base_url || "http://127.0.0.1:11434"}
                  onChange={(e) =>
                    setSettings({ ...settings, ollama_base_url: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Chat Model</label>
                  <input
                    type="text"
                    value={settings.ollama_chat_model || "llama3"}
                    onChange={(e) =>
                      setSettings({ ...settings, ollama_chat_model: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-violet-500"
                    placeholder="llama3"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Embedding Model</label>
                  <input
                    type="text"
                    value={settings.ollama_embed_model || "nomic-embed-text"}
                    onChange={(e) =>
                      setSettings({ ...settings, ollama_embed_model: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-violet-500"
                    placeholder="nomic-embed-text"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedProvider === "gemini" && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">Google Gemini (Free API Key)</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-violet-400 hover:underline"
                >
                  Get Free Key <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  Gemini API Key{" "}
                  {settings.gemini_api_key_masked && (
                    <span className="text-emerald-400 ml-1">
                      (Configured: {settings.gemini_api_key_masked})
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  placeholder={
                    settings.gemini_api_key_masked
                      ? "Enter new key to replace existing"
                      : "AIzaSy..."
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Gemini Model</label>
                <input
                  type="text"
                  value={settings.gemini_chat_model || "gemini-1.5-flash"}
                  onChange={(e) =>
                    setSettings({ ...settings, gemini_chat_model: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}

          {selectedProvider === "openai" && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium">OpenAI or Groq / Custom Endpoint</span>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">API Base URL</label>
                <input
                  type="text"
                  value={settings.openai_base_url || "https://api.openai.com/v1"}
                  onChange={(e) =>
                    setSettings({ ...settings, openai_base_url: e.target.value })
                  }
                  placeholder="https://api.groq.com/openai/v1 or https://api.openai.com/v1"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  API Key{" "}
                  {settings.openai_api_key_masked && (
                    <span className="text-emerald-400 ml-1">
                      (Configured: {settings.openai_api_key_masked})
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={openaiKeyInput}
                  onChange={(e) => setOpenaiKeyInput(e.target.value)}
                  placeholder={
                    settings.openai_api_key_masked
                      ? "Enter new key to replace existing"
                      : "gsk_... or sk-..."
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Chat Model Name</label>
                <input
                  type="text"
                  value={settings.openai_chat_model || "gpt-4o-mini"}
                  onChange={(e) =>
                    setSettings({ ...settings, openai_chat_model: e.target.value })
                  }
                  placeholder="llama-3.3-70b-versatile or gpt-4o-mini"
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition shadow-md shadow-violet-600/20 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save & Apply"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
