"""
contacts_tool.py
AI tool for looking up contacts by name/alias.
Used by the AI to resolve recipient information during communication tasks.
"""

import logging
logger = logging.getLogger(__name__)

import contacts_service


def lookup_contact(name: str, field: str = "emails") -> str:
    """
    Look up a contact by name or alias and return their default value
    for the specified communication field.

    Parameters
    ----------
    name  : The name, nickname, or alias to search for.
    field : The field to retrieve: "emails", "phones", "whatsapp", or a custom field name.

    Returns
    -------
    str : A message with the resolved value, disambiguation prompt, or not-found notice.
    """
    logger.info(f"Tool called: lookup_contact(name={name}, field={field})")

    if not name or not name.strip():
        return "Error: No name provided for contact lookup."

    result = contacts_service.resolve_recipient(name.strip(), field)

    if not result["found"]:
        return (
            f"No contact found matching '{name}'. "
            f"Ask the user for the {field.rstrip('s')} address/number directly."
        )

    if result["ambiguous"]:
        names = ", ".join(
            m.get("full_name", m.get("id", "unknown")) for m in result["matches"]
        )
        return (
            f"Multiple contacts match '{name}': {names}. "
            f"Ask the user which contact they mean."
        )

    if not result["value"]:
        return (
            f"Contact '{result['contact_name']}' was found, but they have no "
            f"{field} on file. Ask the user to provide it directly."
        )

    return str(result['value'])
