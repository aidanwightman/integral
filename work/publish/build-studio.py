"""Build the original workspace collection and embed it in the existing demo."""
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[2]
source = root / 'outputs/workspace-concepts/studio-src'
parts = []
for name in json.loads((source / 'package.json').read_text())['studioScripts']:
    text = (source / name).read_text()
    text = re.sub(r'^import[^\n]+\n', '', text, flags=re.M)
    text = re.sub(r'\bexport ', '', text)
    parts.append(text)
script = '(() => {\n' + '\n'.join(parts) + '\n})();'
assert '</script' not in script.lower()
# Scale authored type sizes, including responsive headings and font shorthands.
# Spacing, grid tracks and media query breakpoints retain their original units.
stylesheets = ['styles.css', 'hierarchy.css', 'compact.css', 'bento-identity.css', 'glass-navigation.css', 'glass-identity.css', 'editorial-signal-identity.css', 'atlas-ledger-identity.css', 'hierarchy-editorial-signal.css', 'hierarchy-atlas-ledger-bento.css', 'forest-identity.css', 'compact-workspace.css', 'outcomes.css', 'commissions.css', 'contacts.css', 'accessibility-controls.css', 'workspace-text-size.css', 'approval-ui.css', 'finance-exceptions.css', 'workspace-alerts.css', 'northstar-preview.css']
css = '\n'.join((source / name).read_text() for name in stylesheets)
css += '\n' + Path(__file__).with_name('control-motion.css').read_text()
type_size = r'(?:clamp\([^()]+\)|(?:\d*\.)?\d+(?:px|rem))'
def scale_type_sizes(text):
    return re.sub(
        rf'(\bfont(?:-size)?\s*:\s*(?:(?:italic|[1-9]00|750)\s+)?)({type_size})',
        r'\1calc(\2 * var(--workspace-text-scale, 1))',
        text,
    )

css = scale_type_sizes(css)
html = (source / 'template.html').read_text().replace('/* STUDIO_CSS */', css).replace('/* STUDIO_JS */', script)
(root / 'outputs/workspace-concepts/industry-studio.html').write_text(html)
encoded = json.dumps(html).replace('<', '\\u003c').replace('>', '\\u003e')
embed = '''<!-- INDUSTRY_STUDIO_BEGIN -->
<script>
(() => {
  const studioHTML = ENCODED_HTML;
  let overlay = null, previousFocus = null, previousOverflow = '';
  function closeStudio() {
    if (!overlay) return;
    overlay.remove(); overlay = null;
    document.body.style.overflow = previousOverflow;
    previousFocus?.focus();
  }
  function resetTextSize() {
    if (overlay && !overlay.hidden) overlay.querySelector('iframe').contentWindow.postMessage(
      {type:'data-saver-reset-text-size'},location.protocol==='file:'?'*':location.origin
    );
  }
  window.DataSaverStudio = {resetTextSize, open() {
    if (overlay) {
      if (overlay.hidden) {
        previousFocus = document.activeElement;
        previousOverflow = document.body.style.overflow;
        overlay.hidden = false;
        document.body.style.overflow = 'hidden';
        const frame = overlay.querySelector('iframe');
        frame.focus();
        resetTextSize();
        frame.contentWindow.postMessage({type:'data-saver-northstar-return'},location.protocol==='file:'?'*':location.origin);
      }
      return;
    }
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    overlay = document.createElement('div');
    overlay.id = 'industry-studio-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#f4f5f8';
    const frame = document.createElement('iframe');
    frame.title = 'Integral industry and function workspace collection';
    frame.style.cssText = 'width:100%;height:100%;border:0;display:block';
    frame.srcdoc = studioHTML;
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    frame.addEventListener('load', () => frame.contentWindow.focus(), {once:true});
  }};
  window.addEventListener('message', event => {
    if (!overlay || overlay.hidden || event.source !== overlay.querySelector('iframe').contentWindow) return;
    if (event.origin!==location.origin && !(location.protocol==='file:' && event.origin==='null')) return;
    if (event.data?.type === 'data-saver-studio-close') closeStudio();
    if (event.data?.type === 'data-saver-open-northstar') {
      overlay.hidden = true;
      document.body.style.overflow = previousOverflow;
      window.dispatchEvent(new Event('data-saver-show-northstar'));
      document.querySelector('[data-act="industryStudio"]')?.focus();
    }
  });
  if (new URLSearchParams(location.search).get('studio') === '1') window.DataSaverStudio.open();
})();
</script>
<!-- INDUSTRY_STUDIO_END -->'''.replace('ENCODED_HTML', encoded)
index = root / 'outputs/workspace-concepts/index.html'
existing = index.read_text()
existing = re.sub(r'\n?<!-- INDUSTRY_STUDIO_BEGIN -->[\s\S]*?<!-- INDUSTRY_STUDIO_END -->\n?', '\n', existing)
# The classic prototype is also its own source. Strip previously generated copies
# before refreshing its shared control. Already scaled type starts with calc().
for marker in ['SHARED_TEXT_SIZE_JS', 'SHARED_TEXT_SIZE_CSS']:
    existing = re.sub(r'/\* '+marker+r'_BEGIN \*/[\s\S]*?/\* '+marker+r'_END \*/\n?', '', existing)
existing = scale_type_sizes(existing)
size_js = '\n'.join((source / name).read_text() for name in ['workspace-text-preference.js', 'workspace-text-size.js'])
size_js = re.sub(r'^import[^\n]+\n', '', size_js, flags=re.M).replace('export ', '')
size_css = (source / 'workspace-text-size.css').read_text()
existing = existing.replace("'use strict';\n", "'use strict';\n/* SHARED_TEXT_SIZE_JS_BEGIN */\n" + size_js + "/* SHARED_TEXT_SIZE_JS_END */\n", 1)
existing = existing.replace('</style>', '/* SHARED_TEXT_SIZE_CSS_BEGIN */\n' + size_css + '/* SHARED_TEXT_SIZE_CSS_END */\n</style>', 1)
if 'industryStudio:' not in existing:
    existing = existing.replace('const ACT={', 'const ACT={\n  industryStudio:()=>window.DataSaverStudio?.open(),', 1)
if 'data-act="industryStudio"' not in existing:
    existing = existing.replace('<button class="nav askai"', '<button class="nav" data-act="industryStudio">${ic(\'palette\')}<span>Workspace gallery</span></button>\n    <button class="nav askai"', 1)
assert existing.count('</body>') == 1
existing = existing.replace('</body>', embed + '\n</body>')
index.write_text(existing)
print('Built workspace collection and embedded it in the main prototype.')
