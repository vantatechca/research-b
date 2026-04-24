"use client";

import { useEffect, useState, useCallback, FormEvent } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

type RuleType = "must_have" | "must_avoid" | "prefer" | "deprioritize";

interface Rule {
  id: string;
  type: RuleType;
  text: string;
  weight: number;
  active: boolean;
}

const RULE_TYPE_META: Record<
  RuleType,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  must_have: {
    label: "Must Have",
    icon: CheckCircle2,
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  must_avoid: {
    label: "Must Avoid",
    icon: XCircle,
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  prefer: {
    label: "Prefer",
    icon: ThumbsUp,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  deprioritize: {
    label: "Deprioritize",
    icon: ThumbsDown,
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
};

const RULE_TYPES: RuleType[] = [
  "must_have",
  "must_avoid",
  "prefer",
  "deprioritize",
];

/* ------------------------------------------------------------------ */
/*  Golden Rules page                                                  */
/* ------------------------------------------------------------------ */

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);

  // Add rule form
  const [newType, setNewType] = useState<RuleType>("must_have");
  const [newText, setNewText] = useState("");
  const [newWeight, setNewWeight] = useState(50);
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editWeight, setEditWeight] = useState(50);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rules");
      const data = await res.json();
      setRules(data.rules ?? data ?? []);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  /* ---------- Add rule ---------- */

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newType,
          text: newText.trim(),
          weight: newWeight,
        }),
      });
      if (res.ok) {
        setNewText("");
        setNewWeight(50);
        await fetchRules();
      }
    } catch {
      // Ignore
    } finally {
      setAdding(false);
    }
  };

  /* ---------- Toggle active ---------- */

  const toggleActive = async (rule: Rule) => {
    try {
      await fetch(`/api/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !rule.active }),
      });
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, active: !r.active } : r
        )
      );
    } catch {
      // Ignore
    }
  };

  /* ---------- Edit / save ---------- */

  const startEdit = (rule: Rule) => {
    setEditId(rule.id);
    setEditText(rule.text);
    setEditWeight(rule.weight);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditText("");
    setEditWeight(50);
  };

  const saveEdit = async () => {
    if (!editId || !editText.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/rules/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText.trim(), weight: editWeight }),
      });
      await fetchRules();
      cancelEdit();
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Delete ---------- */

  const deleteRule = async (id: string) => {
    try {
      await fetch(`/api/rules/${id}`, { method: "DELETE" });
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // Ignore
    }
  };

  /* ---------- Suggest ---------- */

  const suggestRules = async () => {
    setSuggesting(true);
    try {
      const res = await fetch("/api/rules/suggest", { method: "POST" });
      if (res.ok) {
        await fetchRules();
      }
    } catch {
      // Ignore
    } finally {
      setSuggesting(false);
    }
  };

  /* ---------- Group rules by type ---------- */

  const grouped = RULE_TYPES.reduce<Record<RuleType, Rule[]>>(
    (acc, type) => {
      acc[type] = rules.filter((r) => r.type === type);
      return acc;
    },
    { must_have: [], must_avoid: [], prefer: [], deprioritize: [] }
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Golden Rules</h1>
            <p className="mt-1 text-sm text-gray-500">
              Define rules that shape how ideas are scored and prioritized.
            </p>
          </div>
          <Button onClick={suggestRules} disabled={suggesting}>
            {suggesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Suggest Rules
          </Button>
        </div>

        {/* Add rule form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Rule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                <div className="sm:col-span-3">
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">
                    Type
                  </label>
                  <Select
                    value={newType}
                    onChange={(e) =>
                      setNewType(e.target.value as RuleType)
                    }
                  >
                    {RULE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {RULE_TYPE_META[t].label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="sm:col-span-6">
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">
                    Rule Text
                  </label>
                  <Input
                    placeholder='e.g. "Must contain BPC-157 or TB-500"'
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">
                    Weight ({newWeight})
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={newWeight}
                    onChange={(e) => setNewWeight(Number(e.target.value))}
                    className="mt-2 w-full accent-indigo-600"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <Button type="submit" disabled={adding} className="w-full">
                    {adding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Rules grouped by type */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-20 text-gray-400">
            <ShieldCheck className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">No rules defined yet</p>
            <p className="mt-1 text-sm">
              Add rules above or let AI suggest some for you.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {RULE_TYPES.map((type) => {
                const meta = RULE_TYPE_META[type];
                const Icon = meta.icon;   // ← add this
                const items = grouped[type];
                if (items.length === 0) return null;
                return (
                <section key={type}>
                  <h2
                    className={cn(
                      "mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide",
                      meta.color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {meta.label} ({items.length})
                  </h2>
                  <div className="space-y-2">
                    {items.map((rule) => (
                      <div
                        key={rule.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border px-4 py-3 transition-opacity",
                          meta.bg,
                          !rule.active && "opacity-50"
                        )}
                      >
                        {/* Toggle */}
                        <button
                          onClick={() => toggleActive(rule)}
                          className={cn(
                            "relative flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                            rule.active ? "bg-indigo-600" : "bg-gray-300"
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform",
                              rule.active
                                ? "translate-x-[18px]"
                                : "translate-x-0.5"
                            )}
                          />
                        </button>

                        {/* Content */}
                        {editId === rule.id ? (
                          <div className="flex flex-1 items-center gap-2">
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="flex-1 text-sm"
                            />
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500 w-8 text-right">
                                {editWeight}
                              </span>
                              <input
                                type="range"
                                min={1}
                                max={100}
                                value={editWeight}
                                onChange={(e) =>
                                  setEditWeight(Number(e.target.value))
                                }
                                className="w-20 accent-indigo-600"
                              />
                            </div>
                            <Button
                              size="sm"
                              onClick={saveEdit}
                              disabled={saving}
                            >
                              {saving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Save"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="flex-1 text-sm text-gray-800">
                              {rule.text}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              w:{rule.weight}
                            </Badge>
                            <button
                              onClick={() => startEdit(rule)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteRule(rule.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
