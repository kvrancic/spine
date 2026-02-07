"""Extract Enron email dataset from tar.gz archive."""

import tarfile
from pathlib import Path


DEFAULT_ARCHIVE = Path(__file__).resolve().parents[3] / "data" / "enron_mail_20150507.tar.gz"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[3] / "data" / "maildir"


def extract_enron(
    archive_path: Path = DEFAULT_ARCHIVE,
    output_dir: Path | None = None,
) -> Path:
    """Extract enron tar.gz to data/maildir/.

    Returns the path to the extracted maildir directory.
    Skips extraction if the directory already exists and is non-empty.
    """
    if output_dir is None:
        output_dir = archive_path.parent

    maildir = output_dir / "maildir"
    if maildir.exists() and any(maildir.iterdir()):
        print(f"Maildir already exists at {maildir}, skipping extraction.")
        return maildir

    print(f"Extracting {archive_path} to {output_dir}...")
    with tarfile.open(archive_path, "r:gz") as tar:
        tar.extractall(path=output_dir, filter="data")

    if not maildir.exists():
        # Some archives nest under a different name
        extracted = [p for p in output_dir.iterdir() if p.is_dir() and p.name != "maildir"]
        if extracted:
            extracted[0].rename(maildir)

    print(f"Extraction complete: {maildir}")
    return maildir


if __name__ == "__main__":
    extract_enron()
