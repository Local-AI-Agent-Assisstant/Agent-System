/**
 * ContactsApi.js — API layer for the contacts management system.
 * Follows the same pattern as ChatApi.js.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Fetches all contacts from the backend.
 * @returns {Promise<{ok: boolean, contacts: Array}>}
 */
export async function getContacts() {
  const res = await fetch(`${API_BASE}/api/contacts`);
  if (!res.ok) throw new Error("Failed to fetch contacts");
  return res.json();
}

/**
 * Creates a new contact.
 * @param {Object} contact - The contact data to create.
 * @returns {Promise<{ok: boolean, contact: Object}>}
 */
export async function createContact(contact) {
  const res = await fetch(`${API_BASE}/api/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact),
  });
  if (!res.ok) throw new Error("Failed to create contact");
  return res.json();
}

/**
 * Updates an existing contact by ID.
 * @param {string} id - The contact ID.
 * @param {Object} contact - The updated contact data.
 * @returns {Promise<{ok: boolean, contact: Object}>}
 */
export async function updateContact(id, contact) {
  const res = await fetch(`${API_BASE}/api/contacts/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact),
  });
  if (!res.ok) throw new Error("Failed to update contact");
  return res.json();
}

/**
 * Deletes a contact by ID.
 * @param {string} id - The contact ID to delete.
 * @returns {Promise<{ok: boolean}>}
 */
export async function deleteContact(id) {
  const res = await fetch(`${API_BASE}/api/contacts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete contact");
  return res.json();
}

/**
 * Searches contacts by name/alias.
 * @param {string} query - The search query.
 * @returns {Promise<{ok: boolean, contacts: Array}>}
 */
export async function searchContacts(query) {
  const res = await fetch(`${API_BASE}/api/contacts/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to search contacts");
  return res.json();
}
