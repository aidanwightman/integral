"""Build the Integral website and its two interactive demo pages."""
from pathlib import Path
from shutil import copyfile
import subprocess
import sys

root = Path(__file__).resolve().parent
workspace = root / 'outputs/workspace-concepts'
publish = root / 'work/publish'
copyfile(workspace / 'classic-template.html', workspace / 'index.html')
for script in ('build-studio.py', 'build-site.py'):
    subprocess.run([sys.executable, publish / script], cwd=root, check=True)

docs = root / 'docs'
docs.mkdir(exist_ok=True)
for page in ('index.html', 'demo.html', 'workspace.html'):
    copyfile(publish / 'site-dist' / page, docs / page)
