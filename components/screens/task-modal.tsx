// @ts-nocheck
"use client";
import * as React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import * as D from "@/lib/data";
import {
  Icon, Button, Badge, Avatar, AvatarStack,
  Dropdown, DropdownItem, DropdownSeparator,
  PriorityFlag, useConfirm,
} from "@/components/ui";

// ============================================================
// TASK SIDE PANEL — vista de detalle como panel lateral
// ============================================================
export const TaskModal = ({ task, onClose, updateTask, client }) => {
  const confirm = useConfirm();
  const newSubtaskInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // ---- estados locales ----
  const [newComment, setNewComment] = useState("");
  const [newSubtaskInput, setNewSubtaskInput] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragOverPos, setDragOverPos] = useState(null);
  const [animateIn, setAnimateIn] = useState(false);

  // animación de entrada del panel
  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true));
    return () => setAnimateIn(false);
  }, []);

  // ESC cierra
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ---- helpers ----
  const newId = (prefix) =>
    `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

  // Pseudo-número de la tarea para mostrar (#N) — estable a partir del id
  const taskNumber = useMemo(() => {
    let h = 0;
    for (let i = 0; i < task.id.length; i++) h = ((h << 5) - h) + task.id.charCodeAt(i);
    return Math.abs(h) % 1000;
  }, [task.id]);

  const priority = D.PRIORITIES.find((p) => p.id === task.priority);
  const status = D.STATUSES.find((s) => s.id === task.status);
  const mod = client?.modules?.find((m) => m.id === task.moduleId);

  // Categoría: la primera tag que coincida con un id de TASK_CATEGORIES
  const categoryId = (task.tags || []).find((t) => D.TASK_CATEGORIES.some((c) => c.id === t));
  const category = D.taskCategoryById(categoryId);

  const archived = !!(task.customFields?.archived);
  const followed = !!(task.customFields?.followed);

  // ---- log de actividad ----
  const appendActivity = (action) => ({
    id: newId("a"),
    userId: "u1",
    action,
    when: new Date(),
  });
  const logActivity = (action, extraPatch = {}) => {
    const entry = appendActivity(action);
    updateTask({ ...extraPatch, activity: [...(task.activity || []), entry] });
  };

  // ============================================================
  // SUBTAREAS
  // ============================================================
  const subtasks = task.subtasks || [];

  const recalcProgress = (subs) => {
    if (!subs.length) return 0;
    const done = subs.filter((s) => s.done).length;
    return Math.round((done / subs.length) * 100);
  };

  const toggleSub = (i) => {
    const subs = subtasks.map((s, j) => (j === i ? { ...s, done: !s.done } : s));
    updateTask({ subtasks: subs, progress: recalcProgress(subs) });
  };

  const addSubtaskInline = () => {
    const t = newSubtaskInput.trim();
    if (!t) return;
    const subs = [...subtasks, { id: newId("st"), title: t, done: false, assignee: null }];
    updateTask({ subtasks: subs, progress: recalcProgress(subs) });
    setNewSubtaskInput("");
    setTimeout(() => newSubtaskInputRef.current?.focus(), 0);
  };

  const startEditSubtask = (s) => { setEditingId(s.id); setEditingText(s.title); };
  const cancelEditSubtask = () => { setEditingId(null); setEditingText(""); };
  const saveEditSubtask = () => {
    if (!editingId) return;
    const t = editingText.trim();
    if (!t) { cancelEditSubtask(); return; }
    const subs = subtasks.map((s) => (s.id === editingId ? { ...s, title: t } : s));
    updateTask({ subtasks: subs });
    setEditingId(null);
    setEditingText("");
  };

  const deleteSubtask = async (id) => {
    const cur = subtasks.find((s) => s.id === id);
    const ok = await confirm({
      title: "Eliminar subtarea",
      message: `¿Seguro que quieres eliminar "${cur?.title || ""}"?`,
      danger: true,
    });
    if (!ok) return;
    const subs = subtasks.filter((s) => s.id !== id);
    updateTask({ subtasks: subs, progress: recalcProgress(subs) });
  };

  const setSubtaskAssignee = (id, uid) => {
    const subs = subtasks.map((s) => (s.id === id ? { ...s, assignee: uid } : s));
    updateTask({ subtasks: subs });
  };

  // ---- drag & drop ----
  const handleDragStart = (id, e) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", id); } catch {}
  };
  const handleDragOverRow = (id, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragId || dragId === id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? "before" : "after";
    if (id !== dragOverId || pos !== dragOverPos) {
      setDragOverId(id);
      setDragOverPos(pos);
    }
  };
  const handleDragEnd = () => { setDragId(null); setDragOverId(null); setDragOverPos(null); };
  const handleDrop = (id, e) => {
    e.preventDefault();
    if (!dragId || dragId === id) { handleDragEnd(); return; }
    const fromIdx = subtasks.findIndex((s) => s.id === dragId);
    if (fromIdx < 0) { handleDragEnd(); return; }
    const arr = [...subtasks];
    const [moved] = arr.splice(fromIdx, 1);
    let insertIdx = subtasks.findIndex((s) => s.id === id);
    if (dragOverPos === "after") insertIdx++;
    if (fromIdx < insertIdx) insertIdx--;
    arr.splice(insertIdx, 0, moved);
    updateTask({ subtasks: arr });
    handleDragEnd();
  };

  // ============================================================
  // ARCHIVOS
  // ============================================================
  const attachments = task.attachments || [];
  const onPickFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next = [...attachments, ...files.map((f) => f.name)];
    updateTask({ attachments: next });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const removeAttachment = async (idx) => {
    const ok = await confirm({
      title: "Quitar archivo",
      message: `¿Quitar "${attachments[idx]}" de la tarea?`,
      danger: true,
    });
    if (!ok) return;
    const next = attachments.filter((_, i) => i !== idx);
    updateTask({ attachments: next });
  };

  // ============================================================
  // COMENTARIOS
  // ============================================================
  const comments = task.comments || [];
  const sendComment = () => {
    if (!newComment.trim()) return;
    const next = [...comments, { id: newId("c"), userId: "u1", text: newComment.trim(), when: new Date() }];
    updateTask({ comments: next });
    setNewComment("");
  };

  // ============================================================
  // ACCIONES META (panel derecho)
  // ============================================================
  const setStatus = (id) => {
    const st = D.STATUSES.find((s) => s.id === id);
    logActivity(`movió a ${st?.name || id}`, { status: id });
  };
  const setPriority = (id) => updateTask({ priority: id });
  const setCategoryId = (id) => {
    // Reemplazar cualquier categoría previa en tags
    const otherTags = (task.tags || []).filter((t) => !D.TASK_CATEGORIES.some((c) => c.id === t));
    updateTask({ tags: [...otherTags, id] });
  };
  const setDueDate = (str) => {
    if (!str) updateTask({ dueDate: null });
    else updateTask({ dueDate: new Date(str) });
  };
  const toggleAssignee = (uid) => {
    const cur = task.assignees || [];
    const next = cur.includes(uid) ? cur.filter((x) => x !== uid) : [...cur, uid];
    const u = D.userById(uid);
    if (cur.includes(uid)) {
      logActivity(`quitó a ${u?.name || ""} de los asignados`, { assignees: next });
    } else {
      logActivity(`asignó a ${u?.name || ""}`, { assignees: next });
    }
  };

  // ---- archivar / seguir ----
  const toggleArchive = async () => {
    if (!archived) {
      const ok = await confirm({
        title: "Archivar tarea",
        message: "Se moverá al archivo y dejará de aparecer en el tablero. Podrás recuperarla.",
      });
      if (!ok) return;
      logActivity("archivó la tarea", {
        customFields: { ...(task.customFields || {}), archived: true },
      });
      onClose();
    } else {
      logActivity("desarchivó la tarea", {
        customFields: { ...(task.customFields || {}), archived: false },
      });
    }
  };
  const toggleFollow = () => {
    updateTask({
      customFields: { ...(task.customFields || {}), followed: !followed },
    });
  };

  // ============================================================
  // RENDER
  // ============================================================
  const dueStr = task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(23, 18, 12, 0.35)",
          opacity: animateIn ? 1 : 0,
          transition: "opacity 200ms ease",
        }}
      />

      {/* Panel lateral */}
      <aside
        role="dialog"
        aria-label="Detalle de tarea"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(960px, 80vw)", zIndex: 201,
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-30px 0 80px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
          transform: animateIn ? "translateX(0)" : "translateX(20px)",
          opacity: animateIn ? 1 : 0,
          transition: "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 220ms ease",
        }}
      >
        {/* ========= TOP BAR ========= */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 22px", borderBottom: "1px solid var(--border)",
        }}>
          <button
            onClick={onClose}
            title="Cerrar"
            style={{
              padding: 4, color: "var(--text-muted)",
              borderRadius: 6, display: "inline-flex", alignItems: "center",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--beige-bg)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <Icon name="chevronLeft" size={16}/>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-muted)" }}>
            <span>Tablero</span>
            <span style={{ color: "var(--text-faint)" }}>/</span>
            <span style={{ color: "var(--text)", fontWeight: 500 }}>Tarea #{taskNumber}</span>
          </div>
          <div style={{ flex: 1 }}/>
          <button
            onClick={toggleFollow}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
              background: followed ? "var(--purple-soft)" : "var(--surface)",
              color: followed ? "var(--purple)" : "var(--text)",
              border: `1px solid ${followed ? "var(--purple)" : "var(--border)"}`,
            }}
          >
            <Icon name={followed ? "check" : "eye"} size={12}/>
            {followed ? "Siguiendo" : "Seguir"}
          </button>
          <button
            onClick={toggleArchive}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
              background: archived ? "var(--beige)" : "var(--black)",
              color: archived ? "var(--text)" : "var(--beige)",
              border: "1px solid transparent",
            }}
          >
            <Icon name={archived ? "refresh" : "inbox"} size={12}/>
            {archived ? "Desarchivar" : "Archivar"}
          </button>
        </div>

        {/* ========= BODY (2 columnas) ========= */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 280px", overflow: "hidden" }}>
          {/* ========= MAIN ========= */}
          <div style={{ overflow: "auto", padding: "20px 28px 28px" }}>
            {/* Pills (categoría · prioridad · estado) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {category && (
                <span style={{
                  padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 500,
                  background: category.bg, color: category.fg,
                }}>
                  {category.name}
                </span>
              )}
              {priority && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px 3px 8px", borderRadius: 999, fontSize: 11.5, fontWeight: 500,
                  background: "var(--beige-bg)", border: "1px solid var(--border)",
                }}>
                  <PriorityFlag priority={task.priority} size={11}/>
                  {priority.name}
                </span>
              )}
              {status && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px 3px 8px", borderRadius: 999, fontSize: 11.5, fontWeight: 500,
                  background: "var(--beige-bg)", border: "1px solid var(--border)",
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: status.color }}/>
                  {status.name}
                </span>
              )}
              {archived && (
                <span style={{
                  padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 500,
                  background: "#F5E1E1", color: "var(--error)",
                }}>
                  Archivada
                </span>
              )}
            </div>

            {/* Título */}
            <h1 style={{
              fontSize: 24, fontWeight: 600, margin: 0, marginBottom: 6,
              letterSpacing: "-0.01em", lineHeight: 1.2,
              textDecoration: task.status === "done" ? "line-through" : "none",
              color: task.status === "done" ? "var(--text-muted)" : "var(--text)",
            }}>
              {task.title}
            </h1>

            {/* Subtítulo: Creado por X · hace Y */}
            {(() => {
              const createdEntry = (task.activity || []).find((a) => /creó la tarea/i.test(a.action || ""));
              if (!createdEntry) return null;
              const u = D.userById(createdEntry.userId);
              const when = createdEntry.when instanceof Date ? createdEntry.when : new Date(createdEntry.when);
              return (
                <div style={{
                  fontSize: 12, color: "var(--text-muted)", marginBottom: 18,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  <Avatar user={u} size={16}/>
                  Creado por <b style={{ fontWeight: 500, color: "var(--text)" }}>{u?.name || "—"}</b>
                  <span style={{ color: "var(--text-faint)" }}>·</span>
                  <span>{D.relativeTime(when)}</span>
                </div>
              );
            })()}

            {task.description && (
              <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, marginBottom: 22, whiteSpace: "pre-wrap" }}>
                {task.description}
              </div>
            )}

            {/* ========= SUBTAREAS ========= */}
            <Section title="Subtareas" counter={`${subtasks.filter(s => s.done).length}/${subtasks.length}`}>
              {subtasks.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--text-faint)", padding: "4px 0 8px" }}>
                  Sin subtareas todavía.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 8 }}>
                  {subtasks.map((s, i) => {
                    const isEditing = editingId === s.id;
                    const isDragging = dragId === s.id;
                    const isDragOver = dragOverId === s.id && dragId !== s.id;
                    const dropLineTop = isDragOver && dragOverPos === "before";
                    const dropLineBottom = isDragOver && dragOverPos === "after";
                    const assignedUser = s.assignee ? D.userById(s.assignee) : null;
                    return (
                      <div key={s.id || i}
                        draggable={!isEditing}
                        onDragStart={(e) => handleDragStart(s.id, e)}
                        onDragOver={(e) => handleDragOverRow(s.id, e)}
                        onDrop={(e) => handleDrop(s.id, e)}
                        onDragEnd={handleDragEnd}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "7px 8px", borderRadius: 6, fontSize: 13,
                          opacity: isDragging ? 0.4 : 1,
                          borderTop: dropLineTop ? "2px solid var(--purple)" : "2px solid transparent",
                          borderBottom: dropLineBottom ? "2px solid var(--purple)" : "2px solid transparent",
                          marginTop: dropLineTop ? -2 : 0,
                          marginBottom: dropLineBottom ? -2 : 0,
                          cursor: isEditing ? "default" : "grab",
                        }}
                        onMouseEnter={(e) => { if (!isEditing && !isDragging) e.currentTarget.style.background = "var(--beige-bg)"; }}
                        onMouseLeave={(e) => { if (!isEditing && !isDragging) e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{
                          color: "var(--text-faint)", cursor: isEditing ? "default" : "grab",
                          opacity: isEditing ? 0 : 0.4, fontSize: 14, lineHeight: 1, userSelect: "none",
                        }} title="Arrastra para reordenar">⋮⋮</span>
                        <input
                          type="checkbox"
                          checked={s.done}
                          onChange={() => toggleSub(i)}
                          style={{ accentColor: "var(--purple)", cursor: "pointer" }}
                          disabled={isEditing}
                        />
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); saveEditSubtask(); }
                              if (e.key === "Escape") { e.preventDefault(); cancelEditSubtask(); }
                            }}
                            onBlur={saveEditSubtask}
                            style={{
                              flex: 1, padding: "4px 8px", border: "1px solid var(--purple)",
                              borderRadius: 5, fontSize: 13, fontFamily: "inherit", background: "var(--surface)",
                            }}
                          />
                        ) : (
                          <span
                            onClick={() => startEditSubtask(s)}
                            style={{
                              flex: 1, cursor: "text",
                              textDecoration: s.done ? "line-through" : "none",
                              color: s.done ? "var(--text-muted)" : "var(--text)",
                            }}
                          >
                            {s.title}
                          </span>
                        )}

                        {/* Asignado de la subtarea */}
                        {!isEditing && (
                          <Dropdown
                            align="end"
                            trigger={
                              assignedUser ? (
                                <button title={`Asignado a ${assignedUser.name}`} style={{ padding: 0, borderRadius: "50%" }}>
                                  <Avatar user={assignedUser} size={22}/>
                                </button>
                              ) : (
                                <button
                                  title="Asignar subtarea"
                                  style={{
                                    width: 22, height: 22, borderRadius: "50%",
                                    border: "1px dashed var(--border-strong)",
                                    background: "var(--surface)",
                                    color: "var(--text-faint)",
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    opacity: 0.6,
                                  }}
                                >
                                  <Icon name="user" size={11}/>
                                </button>
                              )
                            }
                          >
                            {D.TEAM.map((u) => (
                              <DropdownItem
                                key={u.id}
                                leftIcon={<Avatar user={u} size={18}/>}
                                onClick={() => setSubtaskAssignee(s.id, u.id)}
                              >
                                {u.name}
                              </DropdownItem>
                            ))}
                            {assignedUser && (
                              <>
                                <DropdownSeparator/>
                                <DropdownItem
                                  leftIcon={<Icon name="x" size={12}/>}
                                  onClick={() => setSubtaskAssignee(s.id, null)}
                                >
                                  Quitar asignado
                                </DropdownItem>
                              </>
                            )}
                          </Dropdown>
                        )}

                        {!isEditing && (
                          <>
                            <button
                              onClick={() => startEditSubtask(s)}
                              style={{ color: "var(--text-faint)", padding: 2, opacity: 0.6 }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = "0.6"}
                              title="Renombrar"
                            >
                              <Icon name="edit" size={12}/>
                            </button>
                            <button
                              onClick={() => deleteSubtask(s.id)}
                              style={{ color: "var(--text-faint)", padding: 2, opacity: 0.6 }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = "0.6"}
                              title="Eliminar"
                            >
                              <Icon name="x" size={12}/>
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  ref={newSubtaskInputRef}
                  value={newSubtaskInput}
                  onChange={(e) => setNewSubtaskInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtaskInline(); } }}
                  placeholder="Añadir subtarea y pulsa Enter"
                  style={{
                    flex: 1, padding: "8px 12px",
                    border: "1px solid var(--border)", borderRadius: 7,
                    fontSize: 13, fontFamily: "inherit", background: "var(--surface)",
                  }}
                />
                <Button
                  variant="outline" size="sm"
                  leftIcon={<Icon name="plus" size={12}/>}
                  onClick={addSubtaskInline}
                  disabled={!newSubtaskInput.trim()}
                >
                  Añadir
                </Button>
              </div>
            </Section>

            {/* ========= ARCHIVOS ========= */}
            <Section
              title="Archivos"
              counter={attachments.length}
              right={
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 10px", borderRadius: 999,
                  background: "#F5E1E1", color: "var(--error)",
                  fontSize: 11, fontWeight: 500,
                }}>
                  <Icon name="lock" size={10}/>
                  Almacenamiento permanente
                </span>
              }
            >
              {attachments.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                  {attachments.map((a, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 10px", borderRadius: 6,
                      background: "var(--beige-bg)", fontSize: 12.5,
                    }}>
                      <Icon name="paperclip" size={13} style={{ color: "var(--text-muted)" }}/>
                      <span style={{ flex: 1 }}>{a}</span>
                      <button
                        onClick={() => removeAttachment(i)}
                        style={{ color: "var(--text-faint)", padding: 2, opacity: 0.6 }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = "0.6"}
                        title="Quitar"
                      >
                        <Icon name="x" size={12}/>
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
                variant="outline" size="sm"
                leftIcon={<Icon name="paperclip" size={12}/>}
                onClick={() => fileInputRef.current?.click()}
              >
                Adjuntar archivo
              </Button>
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
                Los archivos se conservan incluso si la tarea se archiva.
              </div>
            </Section>

            {/* ========= COMENTARIOS ========= */}
            <Section title="Comentarios" counter={comments.length}>
              {comments.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 14 }}>
                  {comments.map((c) => {
                    const u = D.userById(c.userId);
                    const when = c.when instanceof Date ? c.when : new Date(c.when);
                    return (
                      <div key={c.id} style={{ display: "flex", gap: 10 }}>
                        <Avatar user={u} size={28}/>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{u?.name || "—"}</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{D.relativeTime(when)}</span>
                          </div>
                          <div style={{ fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{c.text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ position: "relative", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)" }}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendComment(); }
                  }}
                  placeholder="Escribe un comentario…"
                  style={{
                    width: "100%", minHeight: 64, padding: "10px 12px 36px",
                    border: "none", borderRadius: 8, fontSize: 13,
                    resize: "vertical", fontFamily: "inherit",
                    background: "transparent", outline: "none",
                  }}
                />
                <div style={{
                  position: "absolute", left: 8, right: 8, bottom: 6,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Adjuntar archivo"
                    style={{ padding: 4, color: "var(--text-faint)", borderRadius: 4 }}
                  >
                    <Icon name="paperclip" size={14}/>
                  </button>
                  <Button
                    variant="primary" size="sm"
                    leftIcon={<Icon name="arrowRight" size={11}/>}
                    onClick={sendComment}
                    disabled={!newComment.trim()}
                  >
                    Enviar
                  </Button>
                </div>
              </div>
            </Section>
          </div>

          {/* ========= META PANEL ========= */}
          <aside style={{
            borderLeft: "1px solid var(--border)",
            padding: "20px 20px",
            overflow: "auto",
            background: "var(--beige-bg)",
            display: "flex", flexDirection: "column", gap: 16,
          }}>
            {/* ASIGNADO A */}
            <Meta label="Asignado a">
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {(task.assignees || []).map((uid) => {
                  const u = D.userById(uid);
                  if (!u) return null;
                  return (
                    <button
                      key={uid}
                      onClick={() => toggleAssignee(uid)}
                      title={`Quitar a ${u.name}`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "2px 8px 2px 2px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 999, fontSize: 12, fontWeight: 500,
                      }}
                    >
                      <Avatar user={u} size={18}/>
                      {u.name}
                    </button>
                  );
                })}
                <Dropdown
                  align="start"
                  trigger={
                    <button
                      style={{
                        width: 22, height: 22, borderRadius: "50%",
                        border: "1px dashed var(--border-strong)",
                        background: "var(--surface)",
                        color: "var(--text-muted)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                      }}
                      title="Añadir asignado"
                    >
                      <Icon name="plus" size={11}/>
                    </button>
                  }
                >
                  {D.TEAM.filter((u) => !(task.assignees || []).includes(u.id)).map((u) => (
                    <DropdownItem
                      key={u.id}
                      leftIcon={<Avatar user={u} size={16}/>}
                      onClick={() => toggleAssignee(u.id)}
                    >
                      {u.name}
                    </DropdownItem>
                  ))}
                  {D.TEAM.every((u) => (task.assignees || []).includes(u.id)) && (
                    <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-faint)" }}>
                      Todos asignados.
                    </div>
                  )}
                </Dropdown>
              </div>
            </Meta>

            {/* FECHA LÍMITE */}
            <Meta label="Fecha límite">
              <input
                type="date"
                value={dueStr}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: "100%", padding: "5px 8px",
                  border: "1px solid var(--border)", borderRadius: 6,
                  fontSize: 12.5, fontFamily: "inherit", background: "var(--surface)",
                }}
              />
              {!task.dueDate && (
                <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 4 }}>Sin fecha</div>
              )}
            </Meta>

            {/* PRIORIDAD */}
            <Meta label="Prioridad">
              <Dropdown
                align="start"
                trigger={
                  <button style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 10px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
                    border: "1px solid var(--border)", background: "var(--surface)", width: "100%",
                    justifyContent: "space-between",
                  }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <PriorityFlag priority={task.priority} size={11}/>
                      {priority?.name || "—"}
                    </span>
                    <Icon name="chevronDown" size={11} style={{ color: "var(--text-muted)" }}/>
                  </button>
                }
              >
                {D.PRIORITIES.map((p) => (
                  <DropdownItem
                    key={p.id}
                    leftIcon={<PriorityFlag priority={p.id} size={11}/>}
                    onClick={() => setPriority(p.id)}
                  >
                    {p.name}
                  </DropdownItem>
                ))}
              </Dropdown>
            </Meta>

            {/* CATEGORÍA */}
            <Meta label="Categoría">
              <Dropdown
                align="start"
                trigger={
                  <button style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 10px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
                    border: "1px solid var(--border)", background: "var(--surface)", width: "100%",
                    justifyContent: "space-between",
                  }}>
                    <span style={category ? { color: category.fg } : { color: "var(--text-muted)" }}>
                      {category?.name || "Sin categoría"}
                    </span>
                    <Icon name="chevronDown" size={11} style={{ color: "var(--text-muted)" }}/>
                  </button>
                }
              >
                {D.TASK_CATEGORIES.map((c) => (
                  <DropdownItem
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                  >
                    <span style={{
                      padding: "2px 8px", borderRadius: 999, fontSize: 11.5, fontWeight: 500,
                      background: c.bg, color: c.fg,
                    }}>
                      {c.name}
                    </span>
                  </DropdownItem>
                ))}
              </Dropdown>
            </Meta>

            {/* ESTADO */}
            <Meta label="Estado">
              <Dropdown
                align="start"
                trigger={
                  <button style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 10px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
                    border: "1px solid var(--border)", background: "var(--surface)", width: "100%",
                    justifyContent: "space-between",
                  }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: status?.color }}/>
                      {status?.name || "—"}
                    </span>
                    <Icon name="chevronDown" size={11} style={{ color: "var(--text-muted)" }}/>
                  </button>
                }
              >
                {D.STATUSES.map((s) => (
                  <DropdownItem
                    key={s.id}
                    leftIcon={<span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }}/>}
                    onClick={() => setStatus(s.id)}
                  >
                    {s.name}
                  </DropdownItem>
                ))}
              </Dropdown>
            </Meta>

            {/* ACTIVIDAD */}
            <div>
              <div style={{
                fontSize: 10.5, fontWeight: 500, color: "var(--text-muted)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span>Actividad</span>
                <span style={{ color: "var(--text-faint)", fontWeight: 400, letterSpacing: 0 }}>
                  · {(task.activity || []).length}
                </span>
              </div>
              {(!task.activity || task.activity.length === 0) ? (
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Sin actividad todavía.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {task.activity.slice().reverse().map((a) => {
                    const u = D.userById(a.userId);
                    const when = a.when instanceof Date ? a.when : new Date(a.when);
                    return (
                      <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: "var(--purple)", flexShrink: 0, marginTop: 6,
                        }}/>
                        <div style={{ fontSize: 12, lineHeight: 1.4, color: "var(--text)" }}>
                          <b style={{ fontWeight: 500 }}>{u?.name || "Sistema"}</b> {a.action}
                          <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                            {D.relativeTime(when)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </aside>
    </>
  );
};

// ============================================================
// SECTION & META helpers
// ============================================================
const Section = ({ title, counter, right, children }) => (
  <div style={{ marginBottom: 28 }}>
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 10, gap: 10,
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 500, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.06em",
        display: "inline-flex", alignItems: "baseline", gap: 6,
      }}>
        <span>{title}</span>
        {counter !== undefined && counter !== null && counter !== "" && (
          <span style={{ color: "var(--text-faint)", fontWeight: 400, letterSpacing: 0 }}>· {counter}</span>
        )}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Meta = ({ label, children }) => (
  <div>
    <div style={{
      fontSize: 10.5, fontWeight: 500, color: "var(--text-muted)",
      textTransform: "uppercase", letterSpacing: "0.06em",
      marginBottom: 6,
    }}>
      {label}
    </div>
    {children}
  </div>
);
