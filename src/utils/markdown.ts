import DOMPurify from 'dompurify';
import { marked } from 'marked';

// The text comes from an LLM a shopper can steer. Images would load with no click, so a crafted
// URL could leak data; `style` could cover the page with a fake form.
const purifyConfig = {
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'img'],
  FORBID_ATTR: ['style'],
};

// Text the agent reads (catalog, knowledge base, reviews) could plant a phishing link, so only
// links to this site, its subdomains, email and phone stay clickable.
function isOnThisSite(href: string): boolean {
  try {
    const url = new URL(href, window.location.href);
    if (url.protocol === 'mailto:' || url.protocol === 'tel:') return true;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const site = window.location.hostname.replace(/^www\./, '');
    return url.hostname === site || url.hostname.endsWith(`.${site}`);
  } catch {
    return false;
  }
}

/**
 * Turns the agent's markdown into sanitized HTML: paragraphs, bold, links, lists and tables.
 * Links to other sites become plain text. Browser only: without a DOM to sanitize with (server
 * rendering) it returns `''`, so render the plain text instead.
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown || !DOMPurify.isSupported) return '';
  const html = (marked.parse(markdown, { async: false, breaks: true }) as string)
    // A wide table scrolls (AiMessage.css), so keyboard users need to be able to focus it.
    .replace(/<table>/g, '<table tabindex="0">');
  const doc = new DOMParser().parseFromString(DOMPurify.sanitize(html, purifyConfig), 'text/html');
  doc.querySelectorAll('a[href]').forEach((link) => {
    if (!isOnThisSite(link.getAttribute('href')!)) link.replaceWith(...Array.from(link.childNodes));
  });
  return doc.body.innerHTML;
}

/** The agent's markdown as plain text, one space between blocks and table cells, for screen readers. */
export function markdownToText(markdown: string): string {
  const html = renderMarkdown(markdown);
  if (!html) return markdown;
  // An inert document: nothing in it loads or runs.
  const { body } = new DOMParser().parseFromString(html, 'text/html');
  body.querySelectorAll('p, li, th, td, br').forEach((node) => node.append(' '));
  return (body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
