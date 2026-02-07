"""Parse Enron maildir emails into structured objects."""

import email
import re
from dataclasses import dataclass, field
from datetime import datetime
from email.utils import parseaddr, parsedate_to_datetime
from pathlib import Path


@dataclass
class ParsedEmail:
    message_id: str
    sender: str
    recipients_to: list[str] = field(default_factory=list)
    recipients_cc: list[str] = field(default_factory=list)
    recipients_bcc: list[str] = field(default_factory=list)
    subject: str = ""
    body: str = ""
    date: datetime | None = None
    folder: str = ""


# Sent-folder names to look for
SENT_FOLDERS = {"sent", "_sent_mail", "sent_items", "sent_mail"}

# Patterns to filter out system/calendar emails
SYSTEM_SUBJECTS = re.compile(
    r"(calendar|meeting|out of office|automatic reply|undeliverable|"
    r"delivery status|returned mail|postmaster)",
    re.IGNORECASE,
)


def normalize_email(raw: str) -> str:
    """Normalize an email address: extract from 'Name <addr>' format, lowercase, strip."""
    _, addr = parseaddr(raw)
    if addr:
        return addr.strip().lower()
    # Fallback: just clean up the raw string
    return raw.strip().lower().strip("<>")


def parse_recipients(header_value: str | None) -> list[str]:
    """Parse a To/CC/BCC header into a list of normalized email addresses."""
    if not header_value:
        return []
    # Split on comma, but be careful with quoted names containing commas
    parts = re.split(r",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", header_value)
    result = []
    for part in parts:
        addr = normalize_email(part)
        if addr and "@" in addr:
            result.append(addr)
    return result


def parse_email_file(file_path: Path, folder: str = "") -> ParsedEmail | None:
    """Parse a single email file into a ParsedEmail object.

    Returns None if the email should be filtered out.
    """
    try:
        raw = file_path.read_bytes()
        msg = email.message_from_bytes(raw)
    except Exception:
        return None

    # Extract sender
    sender = normalize_email(msg.get("From", ""))
    if not sender or "@" not in sender:
        return None

    # Extract message ID
    message_id = msg.get("Message-ID", "").strip()
    if not message_id:
        # Generate a fallback ID from path
        message_id = f"<{file_path.name}@local>"

    # Extract subject
    subject = msg.get("Subject", "") or ""

    # Filter system/calendar emails
    if SYSTEM_SUBJECTS.search(subject):
        return None

    # Extract body
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    body = payload.decode("utf-8", errors="replace")
                    break
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body = payload.decode("utf-8", errors="replace")

    # Filter empty bodies
    body = body.strip()
    if not body:
        return None

    # Extract date
    date = None
    date_str = msg.get("Date", "")
    if date_str:
        try:
            date = parsedate_to_datetime(date_str)
        except Exception:
            pass

    # Extract recipients
    recipients_to = parse_recipients(msg.get("To"))
    recipients_cc = parse_recipients(msg.get("Cc") or msg.get("CC"))
    recipients_bcc = parse_recipients(msg.get("Bcc") or msg.get("BCC"))

    return ParsedEmail(
        message_id=message_id,
        sender=sender,
        recipients_to=recipients_to,
        recipients_cc=recipients_cc,
        recipients_bcc=recipients_bcc,
        subject=subject,
        body=body,
        date=date,
        folder=folder,
    )


def iter_sent_folders(maildir: Path):
    """Yield (email_file_path, folder_name) for all emails in sent folders."""
    for user_dir in sorted(maildir.iterdir()):
        if not user_dir.is_dir():
            continue
        for folder_name in SENT_FOLDERS:
            sent_dir = user_dir / folder_name
            if not sent_dir.exists():
                continue
            for email_file in sent_dir.rglob("*"):
                if email_file.is_file() and not email_file.name.startswith("."):
                    yield email_file, f"{user_dir.name}/{folder_name}"


def parse_all_emails(maildir: Path, progress: bool = True) -> list[ParsedEmail]:
    """Parse all sent-folder emails from the Enron maildir.

    Returns a list of ParsedEmail objects.
    """
    emails = []
    seen_ids: set[str] = set()
    file_count = 0
    skipped = 0

    for file_path, folder in iter_sent_folders(maildir):
        file_count += 1
        parsed = parse_email_file(file_path, folder=folder)
        if parsed is None:
            skipped += 1
            continue

        # Deduplicate by message_id
        if parsed.message_id in seen_ids:
            skipped += 1
            continue
        seen_ids.add(parsed.message_id)

        emails.append(parsed)

        if progress and len(emails) % 10000 == 0:
            print(f"  Parsed {len(emails)} emails ({file_count} files scanned)...")

    if progress:
        print(f"Parsing complete: {len(emails)} emails from {file_count} files ({skipped} skipped)")

    return emails


if __name__ == "__main__":
    import random
    from .enron_extractor import DEFAULT_OUTPUT

    maildir = DEFAULT_OUTPUT
    if not maildir.exists():
        from .enron_extractor import extract_enron
        maildir = extract_enron()

    emails = parse_all_emails(maildir)
    print(f"\nTotal parsed emails: {len(emails)}")
    print(f"\nSample of 5 random emails:")
    for e in random.sample(emails, min(5, len(emails))):
        print(f"  From: {e.sender}")
        print(f"  To: {', '.join(e.recipients_to[:3])}")
        print(f"  Subject: {e.subject[:80]}")
        print(f"  Date: {e.date}")
        print(f"  Body: {e.body[:100]}...")
        print()
