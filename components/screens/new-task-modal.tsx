// @ts-nocheck
"use client";
import * as React from "react";
import { useState, useEffect, useRef } from "react";
import * as D from "@/lib/data";
import {
  Icon, Button, Modal, Avatar, Dropdown, DropdownItem, DropdownSeparator, PriorityFlag,
} from "@/components/ui";

/**
 * NewTaskModal
 *
 * Modal corporativo para crear tareas. Usado desde:
 *  - ClienteOverview (dashboard de tareas del cliente)
 *  - ClienteModulo  (vista por proyecto)
 *
 * Props:
 *  - open, onClose
 *  - onSubmit(values) — recibe { title, description, moduleId, assignees, dueDate, priority, category, subtasks, attachments }
 *  - projects         — array de { id, name, icon } con los proyectos disponibles del cliente
 *  - defaultModuleId  — id del proyecto preseleccionado (si se abre desde dentro de uno)
 */

const PRIORITIES_FORM = [
  { id: "baja",    name: "Baja",    color: "#9A968D" },
  { id: "media",   name: "Media",   color: "#C89B3C" },
  { id: "alta",    name: "Alta",    color: "#B84545" },
  { id: "urgente", name: "Urgente", color: "#7C2D2D" },
];

export const NewTaskModal = ({ open, onClose, onSubmit, projects = [], defaultModuleId = null }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [moduleId, setModuleId] = useState(defaultModuleId || (projects[0]?.id ?? ""));
  const [assignees, setAssignees] = useState([]); // sin Dani por defecto
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("media");
  const [category, setCategory] = useState("fabricacion");
  const [subtaskInput, setSubtaskInput] = useState("");
  const [subtasks, setSubtasks] = useState([]); // [{id, title, done:false}]
  const [attachments, setAttachments] = useState([]); // [{name, size}]
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  // Reset al abrir
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setModuleId(defaultModuleId || (projects[0]?.id ?? ""));
    setAssignees([]);
    setDueDate("");
    setPriority("media");
    setCategory("fabricacion");
    setSubtaskInput("");
    setSubtasks([]);
    setAttachments([]);
    setError(null);
    setSubmitting(false);
  }, [open, defaultModuleId, projects]);

  const newId = (prefix) =>
    `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

  const addSubtask = () => {
    if (!subtaskInput.trim()) return;
    setSubtasks((s) => [...s, { id: newId("st"), title: subtaskInput.trim(), done: false, assignee: null }]);
    setSubtaskInput("");
  };

  const removeSubtask = (id) => setSubtasks((s) => s.filter((x) => x.id !== id));

  const setSubtaskAssignee = (id, uid) =>
    setSubtasks((arr) => arr.map((x) => (x.id === id ? { ...x, assignee: uid } : x)));

  const toggleAssignee = (uid) => {
    setAssignees((arr) =>
      arr.includes(uid) ? arr.filter((x) => x !== uid) : [...arr, uid]
    );
  };

  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setAttachments((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, size: f.size })),
    ]);
    // permite re-seleccionar el mismo archivo
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx) =>
    setAttachments((arr) => arr.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (!moduleId) {
      setError("Selecciona un proyecto para la tarea.");
      return;
    }
    // Capturar subtarea pendiente (texto en el input no añadido todavía)
    let finalSubtasks = subtasks;
    if (subtaskInput.trim()) {
      finalSubtasks = [
        ...subtasks,
        { id: newId("st"), title: subtaskInput.trim(), done: false, assignee: null },
      ];
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        moduleId,
        assignees,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        category,
        subtasks: finalSubtasks,
        attachments: attachments.map((a) => a.name),
      });
      onClose();
    } catch (e) {
      setError(e?.message || "No se pudo crear la tarea.");
    } finally {
      setSubmitting(false);
    }
  };

  // Lista de miembros del equipo activo + opción de añadir legacy
  const teamMembers = D.TEAM;
  const otherMembers = D.USERS.filter((u) => !D.TEAM_USER_IDS.includes(u.id));

  return (
    <Modal open={open} onClose={onClose} width={680}>
      <div style={{ display: "flex", flexDirection: "column", maxHeight: "92vh" }}>
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Nueva tarea</h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)", padding: 4 }}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflow: "auto", flex: 1 }}>
          {/* Título */}
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la tarea"
            style={{
              width: "100%", padding: "12px 14px",
              border: "1px solid var(--border)", borderRadius: 8,
              fontSize: 15, fontFamily: "inherit", background: "var(--surface)",
              marginBottom: 12,
            }}
          />

          {/* Descripción */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)…"
            style={{
              width: "100%", padding: "10px 14px",
              border: "1px solid transparent", borderRadius: 8,
              fontSize: 13.5, fontFamily: "inherit", background: "transparent",
              resize: "vertical", minHeight: 50,
              color: "var(--text)",
            }}
          />

          <div style={{ borderTop: "1px solid var(--border)", margin: "10px 0 14px" }} />

          {/* Proyecto */}
          <Row label="Proyecto">
            {projects.length === 0 ? (
              <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
                Este cliente no tiene proyectos. Crea uno antes de añadir tareas.
              </span>
            ) : (
              <Dropdown
                align="start"
                trigger={
                  <button
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "6px 12px",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 7, fontSize: 13, fontWeight: 500,
                      minWidth: 220, justifyContent: "space-between",
                    }}
                  >
                    {moduleId ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>{projects.find(p => p.id === moduleId)?.icon}</span>
                        {projects.find(p => p.id === moduleId)?.name || "—"}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-faint)" }}>Selecciona un proyecto</span>
                    )}
                    <Icon name="chevronDown" size={12} style={{ color: "var(--text-muted)" }} />
                  </button>
                }
              >
                {projects.map((p) => (
                  <DropdownItem
                    key={p.id}
                    leftIcon={<span style={{ fontSize: 14 }}>{p.icon}</span>}
                    onClick={() => setModuleId(p.id)}
                  >
                    {p.name}
                  </DropdownItem>
                ))}
              </Dropdown>
            )}
          </Row>

          {/* Asignar a */}
          <Row label="Asignar a">
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {assignees.length === 0 && (
                <span style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
                  Persona asignada
                </span>
              )}
              {assignees.map((uid) => {
                const u = D.userById(uid);
                if (!u) return null;
                return (
                  <div
                    key={uid}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "3px 8px 3px 3px",
                      background: "var(--beige-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 999, fontSize: 12.5, fontWeight: 500,
                    }}
                  >
                    <Avatar user={u} size={20} />
                    {u.name}{uid === "u1" ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> (tú)</span> : null}
                    <button
                      onClick={() => toggleAssignee(uid)}
                      style={{ color: "var(--text-faint)", padding: 1, marginLeft: 2 }}
                      title="Quitar"
                    >
                      <Icon name="x" size={11} />
                    </button>
                  </div>
                );
              })}
              <Dropdown
                align="start"
                trigger={
                  <button
                    style={{
                      width: 28, height: 28, borderRadius: "50%",
                      border: "1px dashed var(--border-strong)",
                      background: "var(--surface)",
                      color: "var(--text-muted)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}
                    title="Añadir asignado"
                  >
                    <Icon name="plus" size={12} />
                  </button>
                }
              >
                {teamMembers
                  .filter((u) => !assignees.includes(u.id))
                  .map((u) => (
                    <DropdownItem
                      key={u.id}
                      leftIcon={<Avatar user={u} size={18} />}
                      onClick={() => toggleAssignee(u.id)}
                    >
                      {u.name}
                    </DropdownItem>
                  ))}
                {teamMembers.every((u) => assignees.includes(u.id)) && (
                  <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-faint)" }}>
                    Todos los miembros ya están asignados.
                  </div>
                )}
              </Dropdown>
            </div>
          </Row>

          {/* Fecha límite */}
          <Row label="Fecha límite">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                padding: "6px 10px", border: "1px solid var(--border)",
                borderRadius: 7, fontSize: 13, fontFamily: "inherit",
                background: "var(--surface)",
              }}
            />
          </Row>

          {/* Prioridad */}
          <Row label="Prioridad">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PRIORITIES_FORM.map((p) => {
                const active = priority === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPriority(p.id)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 10px", borderRadius: 7,
                      fontSize: 12.5, fontWeight: 500,
                      border: `1px solid ${active ? p.color : "var(--border)"}`,
                      background: active ? `${p.color}1A` : "var(--surface)",
                      color: active ? p.color : "var(--text)",
                    }}
                  >
                    <PriorityFlag priority={p.id} size={12} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </Row>

          {/* Categoría */}
          <Row label="Categoría">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {D.TASK_CATEGORIES.map((c) => {
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    style={{
                      padding: "4px 10px", borderRadius: 999,
                      fontSize: 12, fontWeight: 500,
                      border: active ? `1.5px solid ${c.fg}` : "1px solid transparent",
                      background: c.bg, color: c.fg,
                    }}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </Row>

          <div style={{ borderTop: "1px solid var(--border)", margin: "14px 0" }} />

          {/* Subtareas */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 12, fontWeight: 500, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.05em",
                marginBottom: 8, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <Icon name="check" size={12} /> Subtareas
            </div>

            {subtasks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                {subtasks.map((s, i) => {
                  const assignedUser = s.assignee ? D.userById(s.assignee) : null;
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 10px", borderRadius: 6,
                        background: "var(--beige-bg)", fontSize: 13,
                      }}
                    >
                      <span style={{ color: "var(--text-faint)", fontVariantNumeric: "tabular-nums", fontSize: 11 }}>
                        {i + 1}.
                      </span>
                      <span style={{ flex: 1 }}>{s.title}</span>

                      {/* Asignar persona a la subtarea */}
                      <Dropdown
                        align="end"
                        trigger={
                          assignedUser ? (
                            <button
                              title={`Asignado a ${assignedUser.name}`}
                              style={{ padding: 0, borderRadius: "50%" }}
                            >
                              <Avatar user={assignedUser} size={20} />
                            </button>
                          ) : (
                            <button
                              title="Asignar persona"
                              style={{
                                width: 20, height: 20, borderRadius: "50%",
                                border: "1px dashed var(--border-strong)",
                                background: "var(--surface)",
                                color: "var(--text-faint)",
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              <Icon name="user" size={10} />
                            </button>
                          )
                        }
                      >
                        {D.TEAM.map((u) => (
                          <DropdownItem
                            key={u.id}
                            leftIcon={<Avatar user={u} size={16} />}
                            onClick={() => setSubtaskAssignee(s.id, u.id)}
                          >
                            {u.name}
                          </DropdownItem>
                        ))}
                        {assignedUser && (
                          <>
                            <DropdownSeparator />
                            <DropdownItem
                              leftIcon={<Icon name="x" size={11} />}
                              onClick={() => setSubtaskAssignee(s.id, null)}
                            >
                              Quitar asignado
                            </DropdownItem>
                          </>
                        )}
                      </Dropdown>

                      <button
                        onClick={() => removeSubtask(s.id)}
                        style={{ color: "var(--text-faint)", padding: 2 }}
                        title="Quitar"
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addSubtask(); }
                }}
                placeholder="Añadir subtarea y pulsa Enter"
                style={{
                  flex: 1, padding: "8px 12px",
                  border: "1px solid var(--border)", borderRadius: 7,
                  fontSize: 13, fontFamily: "inherit", background: "var(--surface)",
                }}
              />
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon name="plus" size={12} />}
                onClick={addSubtask}
                disabled={!subtaskInput.trim()}
              >
                Añadir
              </Button>
            </div>
          </div>

          {/* Adjuntos */}
          <div style={{ marginBottom: 4 }}>
            <div
              style={{
                fontSize: 12, fontWeight: 500, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.05em",
                marginBottom: 8, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <Icon name="paperclip" size={12} /> Archivos adjuntos
            </div>
            {attachments.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                {attachments.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 10px", borderRadius: 6,
                      background: "var(--beige-bg)", fontSize: 12.5,
                    }}
                  >
                    <Icon name="paperclip" size={12} style={{ color: "var(--text-muted)" }} />
                    <span style={{ flex: 1 }}>{a.name}</span>
                    {a.size != null && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {(a.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                    <button
                      onClick={() => removeAttachment(i)}
                      style={{ color: "var(--text-faint)", padding: 2 }}
                      title="Quitar"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={onPickFiles}
              style={{ display: "none" }}
            />
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Icon name="paperclip" size={12} />}
              onClick={() => fileInputRef.current?.click()}
            >
              Seleccionar archivos
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: 14, padding: "8px 12px",
                background: "#F5E1E1", color: "var(--error)",
                borderRadius: 8, fontSize: 12.5,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px", borderTop: "1px solid var(--border)",
            display: "flex", justifyContent: "flex-end", gap: 8,
            background: "var(--beige-bg)",
          }}
        >
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={submitting || !title.trim()}>
            {submitting ? "Creando…" : "Crear tarea"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const Row = ({ label, children }) => (
  <div
    style={{
      display: "grid", gridTemplateColumns: "120px 1fr", gap: 16,
      alignItems: "center", padding: "8px 0",
    }}
  >
    <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{label}</div>
    <div>{children}</div>
  </div>
);
