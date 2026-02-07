"""Shared test fixtures."""

from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixtures_dir():
    return FIXTURES_DIR


@pytest.fixture
def sample_email_paths(fixtures_dir):
    """Return paths to all non-system, non-empty test email files."""
    return sorted(fixtures_dir.glob("email_*.txt"))
