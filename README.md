# Farzad Jamali portfolio

A static, single-page portfolio built with React, TypeScript, Vite, Tailwind CSS, and Motion. It has no backend, account system, paid API, cookies, or analytics. Hosting is intended for the free GitHub Pages user site at `https://alifarzadjamali.github.io/`.

## Local setup

Use Node.js 22 or newer. From this folder:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. For a production preview:

```sh
npm run build
npm run preview
```

Quality checks:

```sh
npm run lint
npm run typecheck
npm run build
```

On Windows PowerShell with script execution disabled, use `npm.cmd` instead of `npm`.

## Edit content

All portfolio copy, project cards, links, and CV metadata live in [`src/content.ts`](src/content.ts). Layout is in [`src/App.tsx`](src/App.tsx); styling is in [`src/styles.css`](src/styles.css). The main page metadata is in [`index.html`](index.html).

Before publishing:

1. Verify each personal statement, role, course, research claim, and URL. The GitHub profile confirms the current MPhil focus and Deep Learning teaching support, but the site deliberately omits unverified dates and detailed responsibilities.
2. Review the published CV at `public/Ali_Jamali_CV.pdf` whenever the source files in `cv-source/` change. The PDF is a public download, so check its contact details and claims before each update.
3. Recheck the `og:url`, canonical URL, `robots.txt`, and `sitemap.xml` if the site URL changes.

The project copy was grounded in the public GitHub profile and these repositories:

- [Evidence-based fashion recommender](https://github.com/alifarzadjamali/evidence-based-fashion-recommender)
- [Floor-plan document intelligence](https://github.com/farzadismyid/floor-plan-document-intelligence) (redirects to the current owner URL)

The abstract project graphics are CSS, not photographs or screenshots of project results.

## Deploy to GitHub Pages

This folder is the root of the public `alifarzadjamali.github.io` repository. The surrounding `D:\Projects` directory is not a Git repository. The repository name is required for the GitHub Pages user domain.

In the repository's **Settings → Pages**, select **GitHub Actions** as the build and deployment source. The workflow in `.github/workflows/deploy.yml` runs `npm ci`, `npm run build`, uploads `dist`, and deploys it using the official GitHub Pages actions on pushes to `main` or manual dispatch. Vite's base is `/` for the user domain.

Pushing to `main` triggers the deployment workflow. Keep the site content and CV current before each push.

## Maintenance

- Update dependencies deliberately and commit the resulting `package-lock.json`; CI uses the lockfile with `npm ci`.
- Run lint, type checking, and build after content or dependency changes.
- Review project links and time-sensitive profile statements periodically.
- Keep the downloadable CV current when the source files change.
