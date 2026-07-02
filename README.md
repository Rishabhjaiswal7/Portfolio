# Rishabh Jaiswal Portfolio Website

A high-performance, premium, and fully-responsive single-page portfolio website showcasing certifications, projects, achievements, and creative work.

This website is **100% static** and runs entirely in the browser with zero server or database dependencies.

---

## Features

1. **Vibrant Modern Design**: Sleek dark/light modes using standard CSS variables, modern typography (Public Sans, Fraunces, IBM Plex Mono), and smooth micro-animations.
2. **Dynamic UI Touches**: Interactive hover transitions, dynamic SVG "signal-divider" wave flows, tab filters for projects, and a responsive navigation layout.
3. **No Database Needed**: Built with complete self-containment. Certifications, testimonials, and selected works are stored and rendered directly on-page.
4. **Offline Resiliency**: The contact form falls back gracefully to a native mailto client, ensuring visitors can reach you under any network condition.

---

## Directory Structure

```text
Portfolio/
├── .github/
│   └── workflows/
│       └── static.yml       # GitHub Actions workflow for static deployment
├── client/
│   ├── index.html           # Main portfolio landing page (HTML/CSS/JS)
│   └── profile.jpg          # Profile avatar picture
├── .gitignore               # Ignored local files registry
└── README.md                # Project documentation
```

---

## Getting Started

### Local Development
To run and edit the website locally:
1. Open the project folder in your preferred text editor (e.g. VS Code).
2. Open [client/index.html](file:///c:/RISHABH_JAISWAL_CSE_B/Portfolio/client/index.html) in your browser.
3. *Recommended*: Use the **VS Code Live Server** extension to launch a local development server for live-reloading.

---

## Deployment to GitHub Pages

The repository comes pre-packaged with an automated GitHub Actions workflow to publish the site to **GitHub Pages** for free.

### How it works
1. **Push Changes**: Whenever you push changes to the `main` or `master` branch, the [static.yml](file:///c:/RISHABH_JAISWAL_CSE_B/Portfolio/.github/workflows/static.yml) workflow is automatically triggered.
2. **Compilation & Upload**: The workflow automatically checkouts the repo, packages the `./client` directory, and deploys it.
3. **View Online**: Your portfolio will be live at `https://<your-github-username>.github.io/<repository-name>/`.
