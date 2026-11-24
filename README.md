# Integral

The Integral website includes a guided tour and interactive workspaces for sales, finance, operations and people teams. The demos run in the browser using synthetic records.

[Visit the Integral website](https://byintegral.com/).

## Build and preview

From the repository root, run the following commands with Python 3.

```sh
python3 build.py
python3 -m http.server 4184 --bind 127.0.0.1 --directory docs
```

Open the [local homepage](http://127.0.0.1:4184/). The public domain is hosted on Cloudflare Pages. Commit updated source and the rebuilt HTML in `docs/` together so the published site can be reproduced from `main`.

## Free call booking

The timetable and intake form run in preview mode while `bookingUrl` is empty in `outputs/production-site/site-src/config.json`. To take bookings, set the Calendly event’s first custom invitee question to **Phone number** (required) and its second to **What would you like to discuss?** (optional, multiple lines). Add that event’s HTTPS booking link to `bookingUrl` and rebuild. The form passes the email and both answers to those fields when the visitor continues to Calendly. The visitor chooses a live time and confirms the appointment there. [Calendly prefill fields](https://calendly.com/help/how-to-pre-fill-invitee-information-in-your-calendly-link)

## Source

- Edit the landing page, guided walkthrough and project links in `outputs/production-site/site-src/`.
- Edit the industry and role demos in `outputs/workspace-concepts/studio-src/`. The events workspace starts from `outputs/workspace-concepts/classic-template.html`.
- Synthetic datasets and the optional SQLite schema live in `outputs/workspace-concepts/datasets/`. Run `python3 outputs/workspace-concepts/datasets/build-database.py` to rebuild the local database.
- After building, run `node work/studio-tests/site.mjs` and `node work/studio-tests/tenet-partners.mjs` to check the landing page. Additional checks in the same directory cover CRM and finance workflows.
