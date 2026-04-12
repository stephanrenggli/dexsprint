function resolveReleaseHref(value, githubRepo) {
  const href = String(value || "").trim();
  if (!href) return "#";
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `https://github.com${href}`;
  if (href.startsWith("#")) return href;
  if (!githubRepo) return href;
  if (/^(commit|compare|pull|issues|releases|tree|blob)\//i.test(href)) {
    return `https://github.com/${githubRepo}/${href}`;
  }
  return `https://github.com/${githubRepo}/blob/main/${href.replace(/^\.?\//, "")}`;
}

function renderReleaseBodyHtml(bodyHtml, fallbackBody, githubRepo) {
  if (!bodyHtml) {
    const fallback = document.createElement("p");
    fallback.textContent = fallbackBody || "Release notes were not provided for this version.";
    return fallback;
  }
  const wrapper = document.createElement("div");
  wrapper.innerHTML = bodyHtml;
  wrapper.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href");
    link.href = resolveReleaseHref(href || "", githubRepo);
    link.target = "_blank";
    link.rel = "noopener";
  });
  return wrapper;
}

function renderGitHubReleases(releases, githubRepo) {
  const container = document.createElement("div");
  container.className = "changelog-content";

  if (!releases.length) {
    const empty = document.createElement("p");
    empty.className = "changelog-state";
    empty.textContent = "No published releases are available yet.";
    container.appendChild(empty);
    return container;
  }

  releases.forEach((release) => {
    const article = document.createElement("article");
    article.className = "changelog-release";

    const title = document.createElement("h4");
    title.className = "changelog-release__title";
    title.textContent = release.name || release.tag_name || "Untitled release";
    article.appendChild(title);

    const meta = document.createElement("p");
    meta.className = "changelog-release__meta";
    const publishedAt = release.published_at
      ? new Date(release.published_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric"
        })
      : "Unpublished";
    meta.textContent = `Released ${publishedAt}`;
    article.appendChild(meta);

    const body = document.createElement("div");
    body.className = "changelog-release__body";
    body.appendChild(renderReleaseBodyHtml(release.body_html, release.body || "", githubRepo));
    article.appendChild(body);

    if (release.html_url) {
      const link = document.createElement("a");
      link.className = "site-footer__link changelog-release__link";
      link.href = release.html_url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "View on GitHub";
      article.appendChild(link);
    }

    container.appendChild(article);
  });

  return container;
}

export function createChangelogController({ githubRepo, changelogContent }) {
  let changelogMarkupLoaded = false;

  async function ensureChangelogLoaded() {
    if (!changelogContent || changelogMarkupLoaded) return;
    changelogContent.innerHTML = "";
    const loading = document.createElement("p");
    loading.className = "changelog-state";
    loading.textContent = "Loading changelog...";
    changelogContent.appendChild(loading);

    try {
      if (!githubRepo) {
        throw new Error("Missing GitHub repository metadata");
      }
      const response = await fetch(`https://api.github.com/repos/${githubRepo}/releases?per_page=8`, {
        headers: {
          Accept: "application/vnd.github.full+json"
        }
      });
      if (!response.ok) {
        throw new Error(`Unable to load releases (${response.status})`);
      }
      const releases = await response.json();
      const parsed = renderGitHubReleases(
        Array.isArray(releases) ? releases.filter((release) => !release.draft) : [],
        githubRepo
      );
      changelogContent.replaceChildren(parsed);
      changelogMarkupLoaded = true;
    } catch {
      changelogContent.innerHTML = "";
      const fallback = document.createElement("p");
      fallback.className = "changelog-state";
      fallback.textContent =
        "The changelog is not available right now. Please try again after the next published GitHub release.";
      changelogContent.appendChild(fallback);
    }
  }

  return {
    ensureChangelogLoaded
  };
}
