"""Build the customer-facing local preview and a portable static hosting bundle."""
from pathlib import Path
import base64, hashlib, json, re
from html import escape
from urllib.parse import urlparse
root=Path(__file__).resolve().parents[2]
source=root/'outputs/production-site/site-src'
config=json.loads((source/'config.json').read_text())
for field in ['bookingUrl','linkedinUrl','loomUrl']:
    if config.get(field):
        url=urlparse(config[field]);assert url.scheme=='https' and url.netloc, f'{field} must be an HTTPS URL'
        if field=='loomUrl':assert url.hostname in ['loom.com','www.loom.com'] and re.fullmatch(r'/(share|embed)/[a-zA-Z0-9]+/?',url.path), 'Use a Loom share or embed URL'
# Product slices share the dashboard fixtures; no hand-maintained performance figures.
fixtures=json.loads((root/'outputs/workspace-concepts/datasets/agency.json').read_text())
account={x['id']:x['name'] for x in fixtures['accounts']};people={x['id']:x['name'] for x in fixtures['team']}
money=lambda p:f'£{p/100:,.0f}'
slices={
 'sales':{'title':'Pipeline','view':'board','columns':['Account','Stage','Value'],'rows':[[account[x['accountId']],x['stage'],money(x['valuePence'])] for x in fixtures['opportunities'][:3]]},
 'finance':{'title':'Invoice register','view':'collections','columns':['Invoice','Status','Outstanding'],'rows':[[x['number'],x['status'],money(x['totalPence']-x['paidPence'])] for x in fixtures['invoices'][:3]]},
 'operations':{'title':'Delivery board','view':'control','columns':['Work','Status','Progress'],'rows':[[x['title'],x['status'],str(x['progress'])+'%'] for x in fixtures['work'][:3]]},
 'people':{'title':'Leave requests','view':'leave','columns':['Person','From','Status'],'rows':[[people[x['personId']],x['start'],x['status']] for x in fixtures['leave'][:3]]}
}
def tenet_project_links():
    links = []
    arrow = '<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 12l8-8M5 4h7v7"/></svg>'
    for project in json.loads((source/'tenet-projects.json').read_text()):
        name = escape(project['name'])
        if 'icon' in project:
            data = base64.b64encode((source/'tenet-icons'/project['icon']).read_bytes()).decode('ascii')
            icon = f'<img alt="" width="96" height="96" src="data:image/png;base64,{data}">'
        else:
            icon = escape(project['initials'])
        content = f'<span class="tenet-monogram" aria-hidden="true">{icon}</span><span>{name}</span>'
        if not project.get('url'):
            links.append(f'<li><span class="tenet-project">{content}</span></li>')
            continue
        label = escape(f"{project['name']} — {project['description']} (opens in a new tab)", quote=True)
        url = escape(project['url'], quote=True)
        links.append(f'<li><a class="tenet-project" href="{url}" target="_blank" rel="noopener noreferrer" aria-label="{label}" title="{label}">{content}{arrow}</a></li>')
    return '\n'.join(links)

studio_source=root/'outputs/workspace-concepts/studio-src'
text_preference=(studio_source/'workspace-text-preference.js').read_text().replace('export ', '')
northstar_js=(studio_source/'northstar-preview.js').read_text().replace('export function installNorthstarPreview','function installNorthstarPreview')
template=(source/'template.html').read_text().replace('/* SITE_CSS */',(source/'styles.css').read_text()+'\n'+(source/'appearances.css').read_text()+'\n'+(source/'walkthrough.css').read_text()+'\n'+(source/'glass-controls.css').read_text()+'\n'+(source/'bento-identity.css').read_text()+'\n'+(source/'glass-identity.css').read_text()+'\n'+(source/'editorial-signal-identity.css').read_text()+'\n'+(source/'product-story.css').read_text()+'\n'+(source/'marketing-depth.css').read_text()+'\n'+(source/'marketing-rhythm.css').read_text()+'\n'+(source/'controls-identities.css').read_text()+'\n'+(source/'controls-refinement.css').read_text()+'\n'+(source/'liquid-material.css').read_text()+'\n'+(source/'hierarchy-depth.css').read_text()+'\n'+(source/'scroll-header.css').read_text()+'\n'+(source/'workspace-preview.css').read_text()+'\n'+(studio_source/'northstar-preview.css').read_text()+'\n'+(source/'section-rhythm.css').read_text()+'\n'+(source/'universal-controls.css').read_text()+'\n'+(source/'glass-edition.css').read_text()+'\n'+(source/'outcome-stories.css').read_text()+'\n'+(Path(__file__).with_name('control-motion.css')).read_text()+'\n'+(source/'tenet-partners.css').read_text()+'\n'+(source/'landing-composition.css').read_text()+'\n'+(source/'landing-lower.css').read_text()).replace('/* SITE_JS */',text_preference+'\n'+(source/'preview-motion.js').read_text()+'\n'+(source/'app.js').read_text().replace('__PRODUCT_SLICES__',json.dumps(slices).replace('<','\\u003c'))+'\n'+northstar_js+'\n'+(source/'northstar-site.js').read_text()+'\n'+(source/'outcome-stories.js').read_text()+'\n'+(source/'appearances.js').read_text()+'\n'+(source/'walkthrough-data.js').read_text()+'\n'+(source/'walkthrough.js').read_text()+'\n'+(source/'glass-identity.js').read_text()+'\n'+(source/'editorial-signal-identity.js').read_text()+'\n'+(source/'product-story.js').read_text()+'\n'+(source/'product-slices.js').read_text().replace('__PRODUCT_SLICES__',json.dumps(slices).replace('<','\\u003c'))+'\n'+(source/'scroll-header.js').read_text()+'\n'+(source/'tenet-partners.js').read_text()).replace('__SITE_CONFIG__',json.dumps(config).replace('<','\\u003c'))
contact_url = config.get('linkedinUrl')
contact_link = (f'<a class="button dark tenet-contact" href="{escape(contact_url, quote=True)}" target="_blank" rel="noopener noreferrer">Contact Ben on LinkedIn</a>'
                if contact_url else '<a class="button dark tenet-contact" href="#about">About Ben</a>')
discovery_invite = ("Take the eligibility survey below to book an introductory call." if config.get('bookingUrl')
                    else "Put the problem into a short brief you can share with us.")
template = template.replace('__DISCOVERY_INVITE__', discovery_invite)
template = template.replace('__TENET_PROJECT_LINKS__',tenet_project_links()).replace('__TENET_CONTACT__',contact_link)
workspace_html = root/'outputs/workspace-concepts/industry-studio.html'
workspace_build = hashlib.sha256(workspace_html.read_bytes()).hexdigest()[:12]
template = template.replace('__WORKSPACE_BUILD__', workspace_build)
(root/'outputs/production-site/index.html').write_text(template.replace('__DEMO_URL__','../workspace-concepts/industry-studio.html').replace('__NORTHSTAR_URL__','../workspace-concepts/index.html#events-home'))
dist=root/'work/publish/site-dist';dist.mkdir(exist_ok=True)
(dist/'index.html').write_text(template.replace('__DEMO_URL__','demo.html').replace('__NORTHSTAR_URL__','workspace.html#events-home'))
# Resolve the source preview's cross-directory links for this flat, portable bundle.
for workspace, filename in [(workspace_html, 'demo.html'), (root/'outputs/workspace-concepts/index.html', 'workspace.html')]:
    bundled = workspace.read_text().replace('../production-site/index.html', 'index.html')
    bundled = bundled.replace('./index.html#events-home', 'workspace.html#events-home')
    (dist/filename).write_text(bundled)
print('Built customer-facing preview and static bundle: index.html, demo.html, workspace.html')
