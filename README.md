# Autokatalyst — static site

Plain HTML, CSS and JS. No build step.

## Pages

| File | Page |
| --- | --- |
| index.html | Homepage |
| private-equity.html | Expertise — Private Equity |
| collaboration.html | How we work |
| our-work.html | Our work |
| case-study.html | Case study — Data-Driven Lead Generation |
| insights.html | Insights |
| about.html | About |
| contact.html | Talk to us |
| placeholder.html | Placeholder for pages not yet built |

## Structure

    assets/          images, logo, self-hosted display font
    v2/motion.css    motion tokens as custom properties
    v2/motion/       shared motion system (core, modules, hero, transitions)
    v5/styles.css    all page styles
    v5/motion-*.js   per-page motion modules

GSAP and Barba load from a CDN at runtime; everything else is in this folder.

## Deploying to Vercel

Import the repository and deploy with no framework preset — output directory is
the repository root. No build command, no environment variables.
