import { act } from '@testing-library/react';
import CioAsa from '../src/bundled';

const SELECTOR = '#cio-asa-root';

function mountTarget() {
  const container = document.createElement('div');
  container.id = 'cio-asa-root';
  document.body.appendChild(container);
  return container;
}

function mountStylesheet() {
  const style = document.createElement('style');
  style.id = 'cio-asa-styles';
  document.head.appendChild(style);
  return style;
}

describe('bundled entry (standalone browser build)', () => {
  let consoleError;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('publishes itself on window so script-tag consumers can call it', () => {
    expect(window.CioAsa).toBe(CioAsa);
  });

  it('renders into the element matched by the selector', () => {
    const container = mountTarget();

    act(() => {
      CioAsa({ selector: SELECTOR });
    });

    expect(container).not.toBeEmptyDOMElement();
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('forwards the remaining props onto the rendered element', () => {
    const container = mountTarget();

    act(() => {
      CioAsa({ selector: SELECTOR, id: 'my-widget', className: 'my-class' });
    });

    const rendered = container.querySelector('#my-widget');
    expect(rendered).toBeInTheDocument();
    expect(rendered).toHaveClass('my-class');
  });

  it('does not treat `selector` or `includeCSS` as element props', () => {
    const container = mountTarget();

    act(() => {
      CioAsa({ selector: SELECTOR, includeCSS: true });
    });

    const rendered = container.querySelector('div');
    expect(rendered).not.toHaveAttribute('selector');
    expect(rendered).not.toHaveAttribute('includeCSS');
  });

  it('logs an error and renders nothing when the selector matches no element', () => {
    act(() => {
      CioAsa({ selector: '#does-not-exist' });
    });

    expect(consoleError).toHaveBeenCalledWith(
      'CioAsa: There were no elements found for the provided selector',
    );
    expect(document.body).toBeEmptyDOMElement();
  });

  it('disables the bundled stylesheet when includeCSS is false', () => {
    mountTarget();
    const stylesheet = mountStylesheet();

    act(() => {
      CioAsa({ selector: SELECTOR, includeCSS: false });
    });

    expect(stylesheet.disabled).toBe(true);
  });

  it('keeps the bundled stylesheet enabled by default', () => {
    mountTarget();
    const stylesheet = mountStylesheet();
    stylesheet.disabled = true;

    act(() => {
      CioAsa({ selector: SELECTOR });
    });

    expect(stylesheet.disabled).toBe(false);
  });

  it('renders even when the bundled stylesheet is absent', () => {
    const container = mountTarget();

    expect(() =>
      act(() => {
        CioAsa({ selector: SELECTOR, includeCSS: false });
      }),
    ).not.toThrow();
    expect(container.querySelector('div')).toBeInTheDocument();
  });
});
