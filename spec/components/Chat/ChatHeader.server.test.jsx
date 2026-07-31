import React from 'react';
import { renderServerSide, textOf } from '../../test-utils.server';
import ChatHeader from '../../../src/components/Chat/ChatHeader';

describe('ChatHeader (SSR)', () => {
  it('renders the default title into the server markup', () => {
    const html = renderServerSide(<ChatHeader />);

    expect(html).toContain('Shopping Assistant');
    expect(html).toContain('id="cio-asa-chat-title"');
  });

  it('omits the close button when no onClose handler is supplied', () => {
    const html = renderServerSide(<ChatHeader />);

    expect(html).not.toContain('cio-asa-chat-header__close');
  });

  it('renders a labelled close button when onClose is supplied', () => {
    const html = renderServerSide(<ChatHeader onClose={jest.fn()} />);

    expect(html).toContain('cio-asa-chat-header__close');
    expect(html).toContain('aria-label="Close"');
  });

  it('uses translation overrides for the title and close label', () => {
    const html = renderServerSide(
      <ChatHeader
        onClose={jest.fn()}
        translations={{ 'CioAsa.header.title': 'Asistente', 'CioAsa.header.close': 'Cerrar' }}
      />,
    );

    expect(html).toContain('Asistente');
    expect(html).toContain('aria-label="Cerrar"');
  });

  it('receives the resolved title in the component override render props', () => {
    const html = renderServerSide(
      <ChatHeader componentOverrides={{ reactNode: ({ title }) => <header>{title}!</header> }} />,
    );

    expect(textOf(html)).toContain('Shopping Assistant!');
    expect(html).not.toContain('cio-asa-chat-header__title');
  });
});
