import { useState, useEffect, useCallback } from "react";
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
} from "../../api/ContactsApi";

// ── Blank contact template ──
function blankContact() {
  return {
    full_name: "",
    aliases: [],
    emails: [],
    phones: [],
    whatsapp: [],
    notes: "",
    custom_fields: {},
  };
}

// ── Multi-value field editor (emails, phones, whatsapp) ──
function MultiValueField({ label, items, setItems, placeholder, isDark }) {
  const add = () =>
    setItems([...items, { value: "", default: items.length === 0 }]);

  const remove = (idx) => {
    const next = items.filter((_, i) => i !== idx);
    // If we removed the default, make the first one default
    if (next.length > 0 && !next.some((x) => x.default)) {
      next[0].default = true;
    }
    setItems(next);
  };

  const setValue = (idx, val) =>
    setItems(items.map((x, i) => (i === idx ? { ...x, value: val } : x)));

  const setDefault = (idx) =>
    setItems(
      items.map((x, i) => ({ ...x, default: i === idx }))
    );

  const inputCls =
    "flex-1 px-3 py-1.5 rounded-lg text-sm outline-none " +
    (isDark
      ? "bg-neutral-700 text-white placeholder-neutral-500"
      : "bg-zinc-100 text-black placeholder-zinc-400");

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-50">
          {label}
        </span>
        <button
          onClick={add}
          className={
            "text-[11px] px-2 py-0.5 rounded-md transition " +
            (isDark
              ? "text-purple-400 hover:bg-neutral-700"
              : "text-purple-600 hover:bg-zinc-200")
          }
        >
          + Add
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-[11px] opacity-30 italic">No {label.toLowerCase()} added</p>
      )}

      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {/* Default radio */}
          <button
            onClick={() => setDefault(idx)}
            data-tooltip={item.default ? "Default" : "Set as default"}
            data-tooltip-pos="left"
            className={
              "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition " +
              (item.default
                ? "border-purple-500 bg-purple-500"
                : isDark
                ? "border-neutral-600 hover:border-purple-400"
                : "border-zinc-300 hover:border-purple-400")
            }
          >
            {item.default && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          <input
            value={item.value}
            onChange={(e) => setValue(idx, e.target.value)}
            placeholder={placeholder}
            className={inputCls}
          />

          {/* Remove */}
          <button
            onClick={() => remove(idx)}
            className="text-red-400 hover:text-red-300 text-lg leading-none shrink-0 px-1"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Aliases editor ──
function AliasesField({ aliases, setAliases, isDark }) {
  const add = () => setAliases([...aliases, ""]);
  const remove = (idx) => setAliases(aliases.filter((_, i) => i !== idx));
  const update = (idx, val) =>
    setAliases(aliases.map((a, i) => (i === idx ? val : a)));

  const inputCls =
    "flex-1 px-3 py-1.5 rounded-lg text-sm outline-none " +
    (isDark
      ? "bg-neutral-700 text-white placeholder-neutral-500"
      : "bg-zinc-100 text-black placeholder-zinc-400");

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-50">
          Aliases / Nicknames
        </span>
        <button
          onClick={add}
          className={
            "text-[11px] px-2 py-0.5 rounded-md transition " +
            (isDark
              ? "text-purple-400 hover:bg-neutral-700"
              : "text-purple-600 hover:bg-zinc-200")
          }
        >
          + Add
        </button>
      </div>

      {aliases.length === 0 && (
        <p className="text-[11px] opacity-30 italic">No aliases added</p>
      )}

      <div className="flex flex-wrap gap-2">
        {aliases.map((alias, idx) => (
          <div
            key={idx}
            className={
              "flex items-center gap-1 pl-3 pr-1 py-1 rounded-full text-sm " +
              (isDark
                ? "bg-neutral-700 text-neutral-200"
                : "bg-zinc-100 text-zinc-700")
            }
          >
            <input
              value={alias}
              onChange={(e) => update(idx, e.target.value)}
              placeholder="Alias"
              className="bg-transparent outline-none w-24 text-sm"
            />
            <button
              onClick={() => remove(idx)}
              className="text-red-400 hover:text-red-300 text-sm leading-none px-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Custom fields editor ──
function CustomFieldsEditor({ fields, setFields, isDark }) {
  const entries = Object.entries(fields);

  const add = () => setFields({ ...fields, "": "" });
  const remove = (key) => {
    const next = { ...fields };
    delete next[key];
    setFields(next);
  };
  const updateKey = (oldKey, newKey) => {
    const next = {};
    for (const [k, v] of Object.entries(fields)) {
      next[k === oldKey ? newKey : k] = v;
    }
    setFields(next);
  };
  const updateVal = (key, val) => setFields({ ...fields, [key]: val });

  const inputCls =
    "px-3 py-1.5 rounded-lg text-sm outline-none " +
    (isDark
      ? "bg-neutral-700 text-white placeholder-neutral-500"
      : "bg-zinc-100 text-black placeholder-zinc-400");

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-50">
          Custom Fields
        </span>
        <button
          onClick={add}
          className={
            "text-[11px] px-2 py-0.5 rounded-md transition " +
            (isDark
              ? "text-purple-400 hover:bg-neutral-700"
              : "text-purple-600 hover:bg-zinc-200")
          }
        >
          + Add Field
        </button>
      </div>

      {entries.length === 0 && (
        <p className="text-[11px] opacity-30 italic">No custom fields</p>
      )}

      {entries.map(([key, val], idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            value={key}
            onChange={(e) => updateKey(key, e.target.value)}
            placeholder="Field name"
            className={inputCls + " w-28"}
          />
          <input
            value={val}
            onChange={(e) => updateVal(key, e.target.value)}
            placeholder="Value"
            className={inputCls + " flex-1"}
          />
          <button
            onClick={() => remove(key)}
            className="text-red-400 hover:text-red-300 text-lg leading-none shrink-0 px-1"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Contact Editor (Add/Edit form) ──
function ContactEditor({ contact, onSave, onCancel, isDark }) {
  const [form, setForm] = useState(() => ({
    full_name: contact?.full_name || "",
    aliases: [...(contact?.aliases || [])],
    emails: (contact?.emails || []).map((e) => ({ ...e })),
    phones: (contact?.phones || []).map((p) => ({ ...p })),
    whatsapp: (contact?.whatsapp || []).map((w) => ({ ...w })),
    notes: contact?.notes || "",
    custom_fields: { ...(contact?.custom_fields || {}) },
  }));

  const inputCls =
    "w-full px-3 py-2 rounded-lg text-sm outline-none " +
    (isDark
      ? "bg-neutral-700 text-white placeholder-neutral-500"
      : "bg-zinc-100 text-black placeholder-zinc-400");

  const handleSave = () => {
    if (!form.full_name.trim()) return;
    // Clean up empty aliases
    const cleaned = {
      ...form,
      aliases: form.aliases.filter((a) => a.trim()),
      emails: form.emails.filter((e) => e.value.trim()),
      phones: form.phones.filter((p) => p.value.trim()),
      whatsapp: form.whatsapp.filter((w) => w.value.trim()),
    };
    // Remove empty custom fields
    const cf = {};
    for (const [k, v] of Object.entries(cleaned.custom_fields)) {
      if (k.trim()) cf[k.trim()] = v;
    }
    cleaned.custom_fields = cf;
    onSave(cleaned);
  };

  return (
    <div className="space-y-4 px-1">
      {/* Full Name */}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-50 block mb-1">
          Full Name
        </span>
        <input
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          placeholder="Contact name"
          className={inputCls}
          autoFocus
        />
      </div>

      {/* Aliases */}
      <AliasesField
        aliases={form.aliases}
        setAliases={(a) => setForm({ ...form, aliases: a })}
        isDark={isDark}
      />

      {/* Emails */}
      <MultiValueField
        label="Emails"
        items={form.emails}
        setItems={(e) => setForm({ ...form, emails: e })}
        placeholder="email@example.com"
        isDark={isDark}
      />

      {/* Phones */}
      <MultiValueField
        label="Phone Numbers"
        items={form.phones}
        setItems={(p) => setForm({ ...form, phones: p })}
        placeholder="+1234567890"
        isDark={isDark}
      />

      {/* WhatsApp */}
      <MultiValueField
        label="WhatsApp"
        items={form.whatsapp}
        setItems={(w) => setForm({ ...form, whatsapp: w })}
        placeholder="WhatsApp name or number"
        isDark={isDark}
      />

      {/* Notes */}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-50 block mb-1">
          Notes
        </span>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Add notes about this contact..."
          rows={2}
          className={
            inputCls +
            " resize-none"
          }
        />
      </div>

      {/* Custom Fields */}
      <CustomFieldsEditor
        fields={form.custom_fields}
        setFields={(cf) => setForm({ ...form, custom_fields: cf })}
        isDark={isDark}
      />

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className={
            "px-4 py-1.5 rounded-lg border text-sm transition " +
            (isDark
              ? "border-neutral-600 hover:bg-neutral-700"
              : "border-zinc-300 hover:bg-zinc-100")
          }
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!form.full_name.trim()}
          className={
            "px-4 py-1.5 rounded-lg text-sm text-white transition " +
            (form.full_name.trim()
              ? "bg-purple-600 hover:bg-purple-700"
              : "bg-neutral-600 cursor-not-allowed opacity-50")
          }
        >
          {contact?.id ? "Save Changes" : "Add Contact"}
        </button>
      </div>
    </div>
  );
}

// ── Contact Row in list ──
function ContactRow({ contact, onEdit, onDelete, isDark }) {
  const defaultEmail =
    contact.emails?.find((e) => e.default)?.value ||
    contact.emails?.[0]?.value ||
    "";
  const aliasCount = contact.aliases?.length || 0;

  return (
    <div
      className={
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 group " +
        (isDark
          ? "border-neutral-700/60 bg-neutral-800/40 hover:border-neutral-600"
          : "border-zinc-200 bg-white hover:border-zinc-300 shadow-sm")
      }
    >
      {/* Avatar */}
      <div
        className={
          "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 " +
          (isDark
            ? "bg-purple-500/20 text-purple-400"
            : "bg-purple-50 text-purple-600")
        }
      >
        {contact.full_name?.charAt(0)?.toUpperCase() || "?"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">
          {contact.full_name || "Unnamed"}
        </div>
        <div className="text-[11px] opacity-50 truncate">
          {defaultEmail || "No email"}
          {aliasCount > 0 && (
            <span className="ml-2 opacity-70">
              · {aliasCount} alias{aliasCount !== 1 ? "es" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(contact)}
          className={
            "p-1.5 rounded-lg transition text-[11px] " +
            (isDark
              ? "hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200"
              : "hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700")
          }
          data-tooltip="Edit"
          data-tooltip-pos="bottom"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(contact.id)}
          className={
            "p-1.5 rounded-lg transition text-[11px] " +
            (isDark
              ? "hover:bg-red-500/20 text-neutral-400 hover:text-red-400"
              : "hover:bg-red-50 text-zinc-500 hover:text-red-500")
          }
          data-tooltip="Delete"
          data-tooltip-pos="bottom"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  MAIN MODAL
// ════════════════════════════════════════════════════════════
function ContactsModal({ isDark, show, onClose }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list"); // "list" | "editor"
  const [editingContact, setEditingContact] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Load contacts when modal opens
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContacts();
      if (data.ok) setContacts(data.contacts);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (show) {
      fetchContacts();
      setView("list");
      setEditingContact(null);
      setSearch("");
      setDeleteConfirm(null);
    }
  }, [show, fetchContacts]);

  if (!show) return null;

  // ── Handlers ──
  const handleAdd = () => {
    setEditingContact(null);
    setView("editor");
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setView("editor");
  };

  const handleDelete = async (id) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    try {
      await deleteContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Failed to delete contact:", err);
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingContact?.id) {
        // Update existing
        const data = await updateContact(editingContact.id, formData);
        if (data.ok) {
          setContacts((prev) =>
            prev.map((c) => (c.id === editingContact.id ? data.contact : c))
          );
        }
      } else {
        // Create new
        const data = await createContact(formData);
        if (data.ok) {
          setContacts((prev) => [...prev, data.contact]);
        }
      }
      setView("list");
      setEditingContact(null);
    } catch (err) {
      console.error("Failed to save contact:", err);
    }
  };

  const handleCancelEdit = () => {
    setView("list");
    setEditingContact(null);
  };

  // ── Filter ──
  const filtered = search.trim()
    ? contacts.filter((c) => {
        const q = search.toLowerCase();
        if (c.full_name?.toLowerCase().includes(q)) return true;
        if (c.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
        if (c.emails?.some((e) => e.value?.toLowerCase().includes(q))) return true;
        return false;
      })
    : contacts;

  // ── Render ──
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className={
          "w-[32rem] max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden " +
          (isDark
            ? "bg-neutral-800 text-neutral-100"
            : "bg-white text-neutral-900")
        }
      >
        {/* ── Header ── */}
        <div
          className={
            "px-5 py-4 flex items-center justify-between shrink-0 border-b " +
            (isDark ? "border-neutral-700" : "border-zinc-200")
          }
        >
          <div>
            <h1 className="text-lg font-semibold">
              {view === "editor"
                ? editingContact?.id
                  ? "Edit Contact"
                  : "New Contact"
                : "Contacts"}
            </h1>
            {view === "list" && (
              <p className="text-[11px] opacity-40 mt-0.5">
                {contacts.length} contact{contacts.length !== 1 ? "s" : ""} saved
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {view === "list" && (
              <button
                onClick={handleAdd}
                className={
                  "text-[11px] px-3 py-1 rounded-full border transition font-medium " +
                  (isDark
                    ? "border-purple-500/40 text-purple-400 hover:bg-purple-500/20"
                    : "border-purple-200 text-purple-600 hover:bg-purple-50")
                }
              >
                + Add Contact
              </button>
            )}
            {view === "editor" && (
              <button
                onClick={handleCancelEdit}
                className={
                  "text-[11px] px-3 py-1 rounded-full border transition " +
                  (isDark
                    ? "border-neutral-600 hover:bg-neutral-700"
                    : "border-zinc-300 hover:bg-zinc-100")
                }
              >
                ← Back
              </button>
            )}
            <button
              onClick={onClose}
              className={
                "p-1.5 rounded-lg transition " +
                (isDark
                  ? "text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
                  : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700")
              }
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4">
          {view === "list" && (
            <>
              {/* Search */}
              <div
                className={
                  "flex items-center gap-2 px-3 py-2 rounded-xl border mb-3 " +
                  (isDark
                    ? "bg-neutral-700/50 border-neutral-600 text-neutral-300"
                    : "bg-zinc-50 border-zinc-200 text-zinc-600")
                }
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-50 shrink-0">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-40"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="opacity-40 hover:opacity-80"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Contact List */}
              {loading ? (
                <div className="text-sm opacity-40 text-center pt-8">
                  Loading contacts...
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center pt-12 pb-8">
                  <div className="text-3xl mb-3 opacity-20">👤</div>
                  <p className="text-sm opacity-50">
                    {search
                      ? "No contacts match your search."
                      : "No contacts yet. Add your first contact!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((contact) => (
                    <ContactRow
                      key={contact.id}
                      contact={contact}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      isDark={isDark}
                    />
                  ))}
                </div>
              )}

              {/* Delete confirmation toast */}
              {deleteConfirm && (
                <div
                  className={
                    "mt-3 px-4 py-2.5 rounded-xl text-[12px] flex items-center justify-between " +
                    (isDark
                      ? "bg-red-500/10 border border-red-500/30 text-red-300"
                      : "bg-red-50 border border-red-200 text-red-600")
                  }
                >
                  <span>Delete this contact?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(deleteConfirm)}
                      className="font-semibold hover:underline"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="opacity-60 hover:opacity-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {view === "editor" && (
            <ContactEditor
              contact={editingContact}
              onSave={handleSave}
              onCancel={handleCancelEdit}
              isDark={isDark}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ContactsModal;
