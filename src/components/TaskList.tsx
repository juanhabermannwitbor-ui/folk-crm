"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { Contact, FollowUpAction, Task } from "@/lib/types";
import { CATEGORY_LABELS, FOLLOW_UP_ACTION_LABELS } from "@/lib/types";
import { FollowUpBadge } from "@/components/FollowUpBadge";

type ContactOption = Pick<Contact, "id" | "fullName" | "category">;

export function TaskList({
  initialTasks,
  availableContacts,
}: {
  initialTasks: Task[];
  availableContacts: ContactOption[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [contactId, setContactId] = useState("");
  const [actionType, setActionType] = useState<FollowUpAction | "">("");
  const [saving, setSaving] = useState(false);

  const pending = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const completed = useMemo(() => tasks.filter((t) => t.completed), [tasks]);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        dueDate: dueDate || null,
        contactId: contactId || null,
        actionType: actionType || null,
      }),
    });
    setSaving(false);
    if (!res.ok) return;
    const { task } = await res.json();
    setTasks((prev) => [task, ...prev]);
    setTitle("");
    setDueDate("");
    setContactId("");
    setActionType("");
    setShowForm(false);
  }

  async function toggleCompleted(task: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    );
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
  }

  async function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Tareas</h1>
          <p className="text-sm text-neutral-500">
            Todo lo que tenés pendiente y lo que ya resolviste.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          <Plus size={15} /> Nueva tarea
        </button>
      </header>

      <div className="flex-1 overflow-auto px-6 py-4">
        {showForm && (
          <div className="mb-4 space-y-2 rounded-xl border border-neutral-200 bg-white p-3">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="¿Qué hay que hacer?"
              className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
              />
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as FollowUpAction | "")}
                className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
              >
                <option value="">— tipo de acción —</option>
                {(Object.keys(FOLLOW_UP_ACTION_LABELS) as FollowUpAction[]).map((a) => (
                  <option key={a} value={a}>
                    {FOLLOW_UP_ACTION_LABELS[a]}
                  </option>
                ))}
              </select>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="flex-1 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
              >
                <option value="">— sin contacto —</option>
                {availableContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} · {CATEGORY_LABELS[c.category]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Añadir"}
              </button>
            </div>
          </div>
        )}

        {pending.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">
            No tenés tareas pendientes. Buen momento para respirar.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {pending.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={toggleCompleted} onDelete={handleDelete} />
            ))}
          </ul>
        )}

        {completed.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-neutral-600"
            >
              {showCompleted ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              Realizadas ({completed.length})
            </button>
            {showCompleted && (
              <ul className="mt-2 space-y-1.5">
                {completed.map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={toggleCompleted} onDelete={handleDelete} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task)}
        className="h-4 w-4 shrink-0 accent-neutral-900"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${
            task.completed ? "text-neutral-400 line-through" : "text-neutral-900"
          }`}
        >
          {task.title}
        </p>
        {task.contact && (
          <p className="truncate text-xs text-neutral-400">{task.contact.fullName}</p>
        )}
      </div>
      {!task.completed && (
        <FollowUpBadge dueDate={task.dueDate} actionType={task.actionType} />
      )}
      <button
        onClick={() => onDelete(task.id)}
        className="shrink-0 rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-500"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}
