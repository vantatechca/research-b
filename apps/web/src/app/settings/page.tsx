"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import {
  Loader2,
  Save,
  Plus,
  X,
  Download,
  RefreshCw,
  Bot,
  Bell,
  Globe,
  Tag,
  Database,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ScraperConfig {
  reddit: boolean;
  youtube: boolean;
  google_trends: boolean;
  amazon: boolean;
  schedule: string;
}

interface NotificationConfig {
  emailAlerts: boolean;
  highScoreThreshold: number;
  dailyDigest: boolean;
  scraperFailAlerts: boolean;
}

interface Settings {
  scrapers: ScraperConfig;
  aiModel: string;
  notifications: NotificationConfig;
  keywords: { id: string; text: string }[];
}

/* ------------------------------------------------------------------ */
/*  Settings page                                                      */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keyword input
  const [newKeyword, setNewKeyword] = useState("");
  const [addingKeyword, setAddingKeyword] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings({
        scrapers: data.scrapers ?? {
          reddit: true,
          youtube: true,
          google_trends: true,
          amazon: false,
          schedule: "0 */6 * * *",
        },
        aiModel: data.aiModel ?? "gpt-4o",
        notifications: data.notifications ?? {
          emailAlerts: true,
          highScoreThreshold: 70,
          dailyDigest: true,
          scraperFailAlerts: true,
        },
        keywords: data.keywords ?? [],
      });
    } catch {
      // Fallback defaults
      setSettings({
        scrapers: {
          reddit: true,
          youtube: true,
          google_trends: true,
          amazon: false,
          schedule: "0 */6 * * *",
        },
        aiModel: "gpt-4o",
        notifications: {
          emailAlerts: true,
          highScoreThreshold: 70,
          dailyDigest: true,
          scraperFailAlerts: true,
        },
        keywords: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /* ---------- Save settings ---------- */

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Toggle helpers ---------- */

  const toggleScraper = (key: keyof ScraperConfig) => {
    if (!settings) return;
    setSettings({
      ...settings,
      scrapers: {
        ...settings.scrapers,
        [key]: !settings.scrapers[key],
      },
    });
  };

  const toggleNotification = (key: keyof NotificationConfig) => {
    if (!settings) return;
    const current = settings.notifications[key];
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: typeof current === "boolean" ? !current : current,
      },
    });
  };

  /* ---------- Keywords ---------- */

  const addKeyword = async (e: FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !settings) return;
    setAddingKeyword(true);
    try {
      const res = await fetch("/api/settings/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newKeyword.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          ...settings,
          keywords: [
            ...settings.keywords,
            { id: data.id ?? crypto.randomUUID(), text: newKeyword.trim() },
          ],
        });
        setNewKeyword("");
      }
    } catch {
      // Ignore
    } finally {
      setAddingKeyword(false);
    }
  };

  const removeKeyword = async (id: string) => {
    if (!settings) return;
    try {
      await fetch(`/api/settings/keywords/${id}`, { method: "DELETE" });
      setSettings({
        ...settings,
        keywords: settings.keywords.filter((k) => k.id !== id),
      });
    } catch {
      // Ignore
    }
  };

  /* ---------- Toggle component ---------- */

  const ToggleSwitch = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: () => void;
  }) => (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "relative flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        checked ? "bg-indigo-600" : "bg-gray-300"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        )}
      />
    </button>
  );

  /* ---------- Export ---------- */

  const exportIdeas = async () => {
    try {
      const res = await fetch("/api/export/ideas");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "peptideiq-ideas-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Ignore
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure scrapers, notifications, keywords, and more.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : saved ? (
              <RefreshCw className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Scraper Config */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-500" />
                Scraper Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  ["reddit", "Reddit"],
                  ["youtube", "YouTube"],
                  ["google_trends", "Google Trends"],
                  ["amazon", "Amazon"],
                ] as [keyof ScraperConfig, string][]
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700">{label}</span>
                  <ToggleSwitch
                    checked={
                      (settings?.scrapers[key] as boolean) ?? false
                    }
                    onChange={() => toggleScraper(key)}
                  />
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100">
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  Schedule (cron)
                </label>
                <Input
                  value={settings?.scrapers.schedule ?? ""}
                  onChange={(e) =>
                    settings &&
                    setSettings({
                      ...settings,
                      scrapers: {
                        ...settings.scrapers,
                        schedule: e.target.value,
                      },
                    })
                  }
                  placeholder="0 */6 * * *"
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Model */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-violet-500" />
                AI Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">
                  Current Model
                </p>
                <p className="mt-1 text-lg font-semibold text-indigo-600">
                  {settings?.aiModel ?? "gpt-4o"}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Model used for idea analysis and scoring. Contact admin to
                  change.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Email Alerts</span>
                <ToggleSwitch
                  checked={settings?.notifications.emailAlerts ?? true}
                  onChange={() => toggleNotification("emailAlerts")}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Daily Digest</span>
                <ToggleSwitch
                  checked={settings?.notifications.dailyDigest ?? true}
                  onChange={() => toggleNotification("dailyDigest")}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  Scraper Failure Alerts
                </span>
                <ToggleSwitch
                  checked={
                    settings?.notifications.scraperFailAlerts ?? true
                  }
                  onChange={() => toggleNotification("scraperFailAlerts")}
                />
              </div>
              <div className="pt-2 border-t border-gray-100">
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  High Score Alert Threshold
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={
                      settings?.notifications.highScoreThreshold ?? 70
                    }
                    onChange={(e) =>
                      settings &&
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          highScoreThreshold: Number(e.target.value),
                        },
                      })
                    }
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="w-8 text-sm font-medium text-gray-700 text-right">
                    {settings?.notifications.highScoreThreshold ?? 70}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Keywords */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-emerald-500" />
                Tracked Keywords
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={addKeyword} className="flex gap-2">
                <Input
                  placeholder="Add a keyword..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="sm" disabled={addingKeyword}>
                  {addingKeyword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </form>
              <div className="flex flex-wrap gap-2">
                {(settings?.keywords ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No keywords tracked yet.
                  </p>
                ) : (
                  settings?.keywords.map((kw) => (
                    <Badge
                      key={kw.id}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {kw.text}
                      <button
                        onClick={() => removeKeyword(kw.id)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-gray-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Export */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-slate-500" />
              Data Export
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={exportIdeas}>
                <Download className="mr-2 h-4 w-4" />
                Export Ideas (CSV)
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  fetch("/api/export/feedback")
                    .then((r) => r.blob())
                    .then((b) => {
                      const url = URL.createObjectURL(b);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "peptideiq-feedback-export.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    })
                    .catch(() => {})
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Export Feedback (CSV)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
