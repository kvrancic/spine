"""Tests for email parser module."""

from pathlib import Path

from src.parser.email_parser import (
    ParsedEmail,
    normalize_email,
    parse_email_file,
    parse_recipients,
)


class TestNormalizeEmail:
    def test_simple_address(self):
        assert normalize_email("john@enron.com") == "john@enron.com"

    def test_uppercase(self):
        assert normalize_email("John.Smith@Enron.COM") == "john.smith@enron.com"

    def test_name_angle_brackets(self):
        assert normalize_email("John Smith <john.smith@enron.com>") == "john.smith@enron.com"

    def test_quoted_name(self):
        assert normalize_email('"Smith, John" <john.smith@enron.com>') == "john.smith@enron.com"

    def test_whitespace(self):
        assert normalize_email("  john@enron.com  ") == "john@enron.com"


class TestParseRecipients:
    def test_single(self):
        result = parse_recipients("john@enron.com")
        assert result == ["john@enron.com"]

    def test_multiple(self):
        result = parse_recipients("john@enron.com, jane@enron.com")
        assert len(result) == 2
        assert "john@enron.com" in result
        assert "jane@enron.com" in result

    def test_with_names(self):
        result = parse_recipients("John Smith <john@enron.com>, Jane Doe <jane@enron.com>")
        assert result == ["john@enron.com", "jane@enron.com"]

    def test_none(self):
        assert parse_recipients(None) == []

    def test_empty(self):
        assert parse_recipients("") == []


class TestParseEmailFile:
    def test_basic_email(self, fixtures_dir):
        result = parse_email_file(fixtures_dir / "email_01.txt", folder="smith-j/sent")
        assert result is not None
        assert result.sender == "john.smith@enron.com"
        assert "jane.doe@enron.com" in result.recipients_to
        assert "bob.jones@enron.com" in result.recipients_to
        assert "alice.wong@enron.com" in result.recipients_cc
        assert result.subject == "Q3 Budget Review"
        assert "Q3 budget numbers" in result.body
        assert result.date is not None
        assert result.message_id == "<test001@enron.com>"

    def test_reply_email(self, fixtures_dir):
        result = parse_email_file(fixtures_dir / "email_02.txt")
        assert result is not None
        assert result.sender == "jane.doe@enron.com"
        assert result.recipients_to == ["john.smith@enron.com"]
        assert "Re:" in result.subject

    def test_broadcast_email(self, fixtures_dir):
        result = parse_email_file(fixtures_dir / "email_03.txt")
        assert result is not None
        assert len(result.recipients_to) == 6

    def test_bcc_email(self, fixtures_dir):
        result = parse_email_file(fixtures_dir / "email_04.txt")
        assert result is not None
        assert "hr.department@enron.com" in result.recipients_bcc

    def test_external_recipient(self, fixtures_dir):
        result = parse_email_file(fixtures_dir / "email_05.txt")
        assert result is not None
        assert "external.partner@gmail.com" in result.recipients_to

    def test_system_email_filtered(self, fixtures_dir):
        result = parse_email_file(fixtures_dir / "email_06_system.txt")
        assert result is None, "System/calendar emails should be filtered out"

    def test_empty_body_filtered(self, fixtures_dir):
        result = parse_email_file(fixtures_dir / "email_07_empty.txt")
        assert result is None, "Empty body emails should be filtered out"

    def test_name_in_from_header(self, fixtures_dir):
        result = parse_email_file(fixtures_dir / "email_08.txt")
        assert result is not None
        assert result.sender == "sara.lee@enron.com"
        assert result.recipients_to == ["bob.jones@enron.com"]

    def test_cc_recipients(self, fixtures_dir):
        result = parse_email_file(fixtures_dir / "email_09.txt")
        assert result is not None
        assert len(result.recipients_cc) == 2
        assert "bob.jones@enron.com" in result.recipients_cc
        assert "alice.wong@enron.com" in result.recipients_cc

    def test_all_valid_emails_parse(self, fixtures_dir):
        """All non-system, non-empty fixture emails should parse successfully."""
        valid_files = [f for f in fixtures_dir.glob("email_*.txt")
                       if "system" not in f.name and "empty" not in f.name]
        for f in valid_files:
            result = parse_email_file(f)
            assert result is not None, f"Failed to parse {f.name}"
            assert result.sender
            assert result.body
            assert result.message_id
