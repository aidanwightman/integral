"""Build the public Integral website and its static assets."""
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
for asset in ('index.html', 'demo.html', 'workspace.html', 'privacy/index.html', 'integral-icon.png'):
    destination = docs / asset
    destination.parent.mkdir(parents=True, exist_ok=True)
    copyfile(publish / 'site-dist' / asset, destination)
