"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreHorizontal, Building2, MapPin } from "lucide-react";
import type { Contact, PipelineStage } from "@/lib/types";
import { ContactFormModal } from "@/components/ContactFormModal";
import { FollowUpBadge } from "@/components/FollowUpBadge";

type ColumnsState = Record<string, Contact[]>;

function buildColumns(stages: PipelineStage[], contacts: Contact[]): ColumnsState {
  const columns: ColumnsState = {};
  for (const stage of stages) columns[stage.id] = [];
  for (const contact of contacts) {
    if (contact.pipelineStageId && columns[contact.pipelineStageId]) {
      columns[contact.pipelineStageId].push(contact);
    }
  }
  for (const id of Object.keys(columns)) {
    columns[id].sort((a, b) => a.stageOrder - b.stageOrder);
  }
  return columns;
}

export function PipelineBoard({
  initialStages,
  initialContacts,
}: {
  initialStages: PipelineStage[];
  initialContacts: Contact[];
}) {
  const [stages, setStages] = useState(initialStages);
  const [columns, setColumns] = useState<ColumnsState>(() =>
    buildColumns(initialStages, initialContacts)
  );
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [modalStageId, setModalStageId] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [addingStage, setAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");

  // The last column is treated as "won" for conversion-rate purposes — the
  // standard Kanban convention, and one that keeps working if stages get
  // renamed since it's positional rather than name-based.
  const stats = useMemo(() => {
    const allContacts = Object.values(columns).flat();
    const totalLeads = allContacts.length;
    const totalValue = allContacts.reduce((sum, c) => sum + (c.dealValue ?? 0), 0);
    const lastStage = stages[stages.length - 1];
    const wonCount = lastStage ? (columns[lastStage.id]?.length ?? 0) : 0;
    const conversionRate = totalLeads ? Math.round((wonCount / totalLeads) * 100) : 0;
    return { totalLeads, totalValue, wonCount, conversionRate };
  }, [columns, stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const contactsById = useMemo(() => {
    const map = new Map<string, Contact>();
    for (const list of Object.values(columns)) {
      for (const c of list) map.set(c.id, c);
    }
    return map;
  }, [columns]);

  function findColumnOf(contactId: string) {
    return Object.keys(columns).find((stageId) =>
      columns[stageId].some((c) => c.id === contactId)
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const contact = contactsById.get(String(event.active.id));
    setActiveContact(contact ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const fromStage = findColumnOf(activeId);
    const toStage = columns[overId] ? overId : findColumnOf(overId);
    if (!fromStage || !toStage || fromStage === toStage) return;

    setColumns((prev) => {
      const fromItems = [...prev[fromStage]];
      const movingIndex = fromItems.findIndex((c) => c.id === activeId);
      if (movingIndex === -1) return prev;
      const [moving] = fromItems.splice(movingIndex, 1);

      const toItems = [...prev[toStage]];
      const overIndex = toItems.findIndex((c) => c.id === overId);
      const insertAt = overIndex === -1 ? toItems.length : overIndex;
      toItems.splice(insertAt, 0, { ...moving, pipelineStageId: toStage });

      return { ...prev, [fromStage]: fromItems, [toStage]: toItems };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveContact(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const stageId = columns[overId] ? overId : findColumnOf(overId);
    if (!stageId) return;

    setColumns((prev) => {
      const items = prev[stageId];
      const oldIndex = items.findIndex((c) => c.id === activeId);
      const newIndex = columns[overId] ? items.length - 1 : items.findIndex((c) => c.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
      return { ...prev, [stageId]: arrayMove(items, oldIndex, newIndex) };
    });

    const finalItems = columns[stageId];
    const idx = finalItems.findIndex((c) => c.id === activeId);

    await fetch(`/api/contacts/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineStageId: stageId, stageOrder: idx === -1 ? finalItems.length : idx }),
    });
  }

  function handleCreated(contact: Contact) {
    if (!contact.pipelineStageId) return;
    setColumns((prev) => ({
      ...prev,
      [contact.pipelineStageId!]: [contact, ...(prev[contact.pipelineStageId!] ?? [])],
    }));
    setModalStageId(null);
  }

  function handleEdited(contact: Contact) {
    setColumns((prev) => {
      const withoutContact: ColumnsState = {};
      for (const stageId of Object.keys(prev)) {
        withoutContact[stageId] = prev[stageId].filter((c) => c.id !== contact.id);
      }
      if (contact.category === "LEAD" && contact.pipelineStageId && withoutContact[contact.pipelineStageId]) {
        withoutContact[contact.pipelineStageId] = [contact, ...withoutContact[contact.pipelineStageId]];
      }
      return withoutContact;
    });
    setEditingContact(null);
  }

  async function handleAddStage() {
    const name = newStageName.trim();
    if (!name) return;
    const res = await fetch("/api/stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const { stage } = await res.json();
      setStages((prev) => [...prev, stage]);
      setColumns((prev) => ({ ...prev, [stage.id]: [] }));
    }
    setNewStageName("");
    setAddingStage(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-6 border-b border-neutral-200 bg-white px-6 py-3 text-sm">
        <Stat label="Leads en pipeline" value={stats.totalLeads.toString()} />
        <Stat label="Valor total" value={`${stats.totalValue.toLocaleString("es-ES")} €`} />
        <Stat
          label="Tasa de conversión"
          value={`${stats.conversionRate}%`}
          hint={`${stats.wonCount} de ${stats.totalLeads} en la última fase`}
        />
      </div>
      <div className="flex flex-1 gap-4 overflow-x-auto px-6 py-4">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {stages.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            contacts={columns[stage.id] ?? []}
            onAddLead={() => setModalStageId(stage.id)}
            onEditContact={setEditingContact}
          />
        ))}
        <DragOverlay>
          {activeContact ? <LeadCard contact={activeContact} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <div className="w-72 shrink-0">
        {addingStage ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-3">
            <input
              autoFocus
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
              placeholder="Nombre de la fase"
              className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleAddStage}
                className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white"
              >
                Añadir
              </button>
              <button
                onClick={() => setAddingStage(false)}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-500"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingStage(true)}
            className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-neutral-300 px-3 py-2.5 text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
          >
            <Plus size={15} /> Nueva fase
          </button>
        )}
      </div>
      </div>

      {modalStageId && (
        <ContactFormModal
          category="LEAD"
          defaultStageId={modalStageId}
          stages={stages}
          onClose={() => setModalStageId(null)}
          onSaved={handleCreated}
        />
      )}

      {editingContact && (
        <ContactFormModal
          category={editingContact.category}
          contact={editingContact}
          stages={stages}
          onClose={() => setEditingContact(null)}
          onSaved={handleEdited}
        />
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="text-base font-semibold text-neutral-900">{value}</p>
      {hint && <p className="text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

function Column({
  stage,
  contacts,
  onAddLead,
  onEditContact,
}: {
  stage: PipelineStage;
  contacts: Contact[];
  onAddLead: () => void;
  onEditContact: (contact: Contact) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = contacts.reduce((sum, c) => sum + (c.dealValue ?? 0), 0);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-neutral-100/70">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-sm font-semibold text-neutral-800">{stage.name}</h3>
          <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600">
            {contacts.length}
          </span>
        </div>
        <button
          onClick={onAddLead}
          className="rounded-md p-1 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
          title="Añadir lead"
        >
          <Plus size={15} />
        </button>
      </div>
      {total > 0 && (
        <p className="px-3 pb-2 text-xs text-neutral-500">
          {total.toLocaleString("es-ES")} € potenciales
        </p>
      )}

      <SortableContext items={contacts.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 space-y-2 overflow-y-auto px-2 pb-3 ${
            isOver ? "bg-neutral-200/40" : ""
          }`}
          style={{ minHeight: 80 }}
        >
          {contacts.map((contact) => (
            <SortableLeadCard key={contact.id} contact={contact} onEdit={onEditContact} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableLeadCard({
  contact,
  onEdit,
}: {
  contact: Contact;
  onEdit: (contact: Contact) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: contact.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LeadCard contact={contact} onEdit={onEdit} />
    </div>
  );
}

function LeadCard({
  contact,
  dragging,
  onEdit,
}: {
  contact: Contact;
  dragging?: boolean;
  onEdit?: (contact: Contact) => void;
}) {
  return (
    <div
      onClick={() => onEdit?.(contact)}
      className={`cursor-grab rounded-lg border border-neutral-200 bg-white p-3 shadow-sm active:cursor-grabbing ${
        dragging ? "rotate-2 shadow-md" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-neutral-900">{contact.fullName}</p>
        <MoreHorizontal size={15} className="mt-0.5 shrink-0 text-neutral-300" />
      </div>
      {(contact.title || contact.company) && (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
          <Building2 size={11} />
          {[contact.title, contact.company].filter(Boolean).join(" · ")}
        </p>
      )}
      {contact.location && (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
          <MapPin size={11} />
          {contact.location}
        </p>
      )}
      {contact.dealValue ? (
        <p className="mt-2 text-xs font-semibold text-neutral-700">
          {contact.dealValue.toLocaleString("es-ES")} €
        </p>
      ) : null}
      {contact.nextFollowUpAt && (
        <div className="mt-2">
          <FollowUpBadge
            dueDate={contact.nextFollowUpAt}
            actionType={contact.nextFollowUpAction}
            size="xs"
          />
        </div>
      )}
    </div>
  );
}
