import os
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

logger = logging.getLogger(__name__)

from config import SAFE_WRITE_DIR
  



#----------------send email (Gmail)-----------------------------------------------------------------------------------------

def send_email_gmail(
    to: str,
    subject: str,
    body: str,
    attachment: str | list | None = None,
    gmail_user: str | None = None,
    gmail_password: str | None = None

) -> str:
    """
    Send an email using Gmail SMTP with optional file attachment.

    attachment:
      - filename only (e.g. "steps.pdf") → taken from written_files/
      - OR full absolute path
    """

    logger.info(f"Tool called: send_email_gmail(to={to}, subject={subject})")

    if not gmail_user or not gmail_password:
        return "Please configure your Gmail first (email + app password)."
    
    msg = MIMEMultipart()
    msg["From"] = gmail_user
    msg["To"] = to
    msg["Subject"] = subject

    msg.attach(MIMEText(body, "plain"))

    # ---------- Attachment handling ----------
    attachments = []
    if isinstance(attachment, str):
        attachments = [attachment]
    elif isinstance(attachment, list):
        attachments = attachment

    for att in attachments:
        if not os.path.isabs(att):
            att = os.path.join(SAFE_WRITE_DIR, os.path.basename(att))

        if not os.path.exists(att):
            return f"Attachment not found: {att}"

        with open(att, "rb") as f:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(f.read())

        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            f'attachment; filename="{os.path.basename(att)}"',
        )
        msg.attach(part)

    return {
        "response": "",
        "tool": "send email",
        "email_preview": {
        "to": to,
        "subject": subject,
        "body": body,
        "attachment": attachment
    }
}