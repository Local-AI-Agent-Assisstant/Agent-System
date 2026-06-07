"""
contacts_service.py
Shared contacts service for the AI assistant.
Provides CRUD operations and lookup functions for the contacts database.
All communication tools should import from this module.

Storage: contacts.json (in BASE_DIR)
"""

import os
import json
import uuid
import logging
import threading

logger = logging.getLogger(__name__)

from config import BASE_DIR

CONTACTS_FILE = os.path.join(BASE_DIR, "contacts.json")
_lock = threading.Lock()


def _ensure_file():
    """Create contacts.json with empty structure if it doesn't exist."""
    if not os.path.exists(CONTACTS_FILE):
        with open(CONTACTS_FILE, "w", encoding="utf-8") as f:
            json.dump({"contacts": []}, f, indent=2)
        logger.info(f"Created new contacts file: {CONTACTS_FILE}")


def load_contacts() -> list:
    """Load and return the full contacts list from disk."""
    with _lock:
        _ensure_file()
        try:
            with open(CONTACTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data.get("contacts", [])
        except Exception as e:
            logger.error(f"Failed to load contacts: {e}")
            return []


def save_contacts(contacts_list: list):
    """Write the contacts list to disk."""
    with _lock:
        _ensure_file()
        try:
            with open(CONTACTS_FILE, "w", encoding="utf-8") as f:
                json.dump({"contacts": contacts_list}, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save contacts: {e}")
            raise


def add_contact(contact_dict: dict) -> dict:
    """
    Add a new contact. Generates a unique ID if not provided.
    Returns the created contact.
    """
    contacts = load_contacts()

    if not contact_dict.get("id"):
        contact_dict["id"] = f"contact_{uuid.uuid4().hex[:8]}"

    # Ensure required fields have defaults
    contact_dict.setdefault("full_name", "")
    contact_dict.setdefault("aliases", [])
    contact_dict.setdefault("emails", [])
    contact_dict.setdefault("phones", [])
    contact_dict.setdefault("whatsapp", [])
    contact_dict.setdefault("notes", "")
    contact_dict.setdefault("custom_fields", {})

    contacts.append(contact_dict)
    save_contacts(contacts)
    logger.info(f"Added contact: {contact_dict['full_name']} ({contact_dict['id']})")
    return contact_dict


def update_contact(contact_id: str, contact_dict: dict) -> dict | None:
    """
    Update an existing contact by ID.
    Returns the updated contact or None if not found.
    """
    contacts = load_contacts()

    for i, c in enumerate(contacts):
        if c["id"] == contact_id:
            contact_dict["id"] = contact_id  # preserve ID
            contacts[i] = contact_dict
            save_contacts(contacts)
            logger.info(f"Updated contact: {contact_id}")
            return contact_dict

    logger.warning(f"Contact not found for update: {contact_id}")
    return None


def delete_contact(contact_id: str) -> bool:
    """
    Delete a contact by ID.
    Returns True if deleted, False if not found.
    """
    contacts = load_contacts()
    original_len = len(contacts)
    contacts = [c for c in contacts if c["id"] != contact_id]

    if len(contacts) < original_len:
        save_contacts(contacts)
        logger.info(f"Deleted contact: {contact_id}")
        return True

    logger.warning(f"Contact not found for deletion: {contact_id}")
    return False


def find_contact(query: str) -> list:
    """
    Search contacts by full_name or any alias (case-insensitive substring match).
    Returns a list of matching contact dicts.
    """
    if not query or not query.strip():
        return []

    contacts = load_contacts()
    query_lower = query.strip().lower()
    matches = []

    for contact in contacts:
        # Check full name
        if query_lower in contact.get("full_name", "").lower():
            matches.append(contact)
            continue

        # Check aliases
        aliases = contact.get("aliases", [])
        for alias in aliases:
            if query_lower == alias.lower() or query_lower in alias.lower():
                matches.append(contact)
                break

    return matches


def _get_default_value(items: list) -> str | None:
    """
    From a list of {value, default} dicts, return the default value.
    Falls back to the first item if no default is set.
    """
    if not items:
        return None

    for item in items:
        if item.get("default", False):
            return item.get("value")

    # Fallback: return first item's value
    return items[0].get("value") if items else None


def get_default_email(contact: dict) -> str | None:
    """Get the default email for a contact."""
    return _get_default_value(contact.get("emails", []))


def get_default_phone(contact: dict) -> str | None:
    """Get the default phone number for a contact."""
    return _get_default_value(contact.get("phones", []))


def get_default_whatsapp(contact: dict) -> str | None:
    """Get the default WhatsApp name/number for a contact."""
    return _get_default_value(contact.get("whatsapp", []))


def get_default_custom_field(contact: dict, field_name: str) -> str | None:
    """Get the value of a custom field by name."""
    return contact.get("custom_fields", {}).get(field_name)


def resolve_recipient(query: str, field: str = "emails") -> dict:
    """
    Given a name/alias, find the matching contact and return the default
    value for the specified field.

    Returns:
        {
            "found": True/False,
            "ambiguous": True/False,
            "value": str or None,
            "contact_name": str or None,
            "matches": list (when ambiguous)
        }
    """
    matches = find_contact(query)

    if len(matches) == 0:
        return {
            "found": False,
            "ambiguous": False,
            "value": None,
            "contact_name": None,
            "matches": [],
        }

    if len(matches) == 1:
        contact = matches[0]
        if field == "emails":
            value = get_default_email(contact)
        elif field == "phones":
            value = get_default_phone(contact)
        elif field == "whatsapp":
            value = get_default_whatsapp(contact)
        else:
            value = get_default_custom_field(contact, field)

        return {
            "found": True,
            "ambiguous": False,
            "value": value,
            "contact_name": contact.get("full_name", ""),
            "matches": [contact],
        }

    # Multiple matches — ambiguous
    return {
        "found": True,
        "ambiguous": True,
        "value": None,
        "contact_name": None,
        "matches": [
            {"id": m["id"], "full_name": m.get("full_name", "")}
            for m in matches
        ],
    }
