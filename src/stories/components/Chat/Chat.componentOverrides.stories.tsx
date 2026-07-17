import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Chat from '../../../components/Chat/Chat';
import CioAsaProvider from '../../../components/CioAsaProvider/CioAsaProvider';
import { DEMO_API_KEY } from '../../../constants';

const defaultTermsHtml =
  'By submitting a search via the virtual style assistant, you agree to our <a href="#">Terms</a>.';

const decorator = (Story: React.ComponentType) => (
  <CioAsaProvider apiKey={DEMO_API_KEY}>
    <div style={{ width: '504px', height: '700px', borderRadius: '12px', overflow: 'hidden' }}>
      <Story />
    </div>
  </CioAsaProvider>
);

const meta = {
  title: 'Components/Chat/Component Overrides',
  component: Chat,
  parameters: {
    layout: 'centered',
  },
  tags: [],
  decorators: [decorator],
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CustomHeader: Story = {
  name: 'Custom Header',
  args: {
    onClose: () => alert('Close'),
    initialSuggestions: ['Show me summer dresses', 'Best running shoes'],
    termsText: <span dangerouslySetInnerHTML={{ __html: defaultTermsHtml }} />,
    componentOverrides: {
      header: {
        reactNode: ({ title, onClose }) => (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
            }}>
            <span style={{ fontWeight: 600, fontSize: '16px' }}>{title}</span>
            <button
              type='button'
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
              }}>
              ✕
            </button>
          </div>
        ),
      },
    },
  },
};

export const CustomLoader: Story = {
  name: 'Custom AI Loader',
  args: {
    onClose: () => alert('Close'),
    initialSuggestions: ['Show me summer dresses'],
    termsText: <span dangerouslySetInnerHTML={{ __html: defaultTermsHtml }} />,
    componentOverrides: {
      aiMessage: {
        loader: {
          reactNode: () => (
            <div
              style={{
                padding: '12px 16px',
                color: '#6b7280',
                fontSize: '13px',
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
              Thinking
              <span className='cio-asa-thinking-dots' />
            </div>
          ),
        },
      },
    },
  },
};

export const CustomText: Story = {
  name: 'Custom AI Text',
  args: {
    onClose: () => alert('Close'),
    initialSuggestions: ['Show me summer dresses'],
    termsText: <span dangerouslySetInnerHTML={{ __html: defaultTermsHtml }} />,
    componentOverrides: {
      aiMessage: {
        text: {
          reactNode: ({ text }) => (
            <div
              style={{
                padding: '12px 16px',
                background: '#f0f4ff',
                borderRadius: '12px',
                border: '1px solid #d4deff',
                fontSize: '14px',
                lineHeight: '22px',
              }}>
              {text}
            </div>
          ),
        },
      },
    },
  },
};

export const CustomWelcomeTitle: Story = {
  name: 'Custom Welcome Title',
  args: {
    onClose: () => alert('Close'),
    initialSuggestions: ['Show me summer dresses', 'Best running shoes'],
    termsText: <span dangerouslySetInnerHTML={{ __html: defaultTermsHtml }} />,
    componentOverrides: {
      welcomeScreen: {
        title: {
          reactNode: ({ text }) => (
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '32px' }}>✨</span>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  margin: '8px 0 0',
                }}>
                {text}
              </h2>
            </div>
          ),
        },
      },
    },
  },
};

export const CustomSuggestedQuestions: Story = {
  name: 'Custom Suggested Questions',
  args: {
    onClose: () => alert('Close'),
    initialSuggestions: [
      'Show me summer dresses',
      'Best running shoes under $100',
      'What should I wear to a party?',
    ],
    termsText: <span dangerouslySetInnerHTML={{ __html: defaultTermsHtml }} />,
    componentOverrides: {
      welcomeScreen: {
        suggestedQuestions: {
          reactNode: ({ suggestions, onSuggestionClick }) => (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type='button'
                  onClick={() => onSuggestionClick(s)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    background: '#fafafa',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}>
                  💬 {s}
                </button>
              ))}
            </div>
          ),
        },
      },
    },
  },
};

export const CustomInput: Story = {
  name: 'Custom Chat Input',
  args: {
    onClose: () => alert('Close'),
    initialSuggestions: ['Show me summer dresses'],
    termsText: <span dangerouslySetInnerHTML={{ __html: defaultTermsHtml }} />,
    componentOverrides: {
      input: {
        reactNode: ({ value, onChange, onSubmit, placeholder, isDisabled }) => (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 16px',
              borderTop: '1px solid #e5e7eb',
            }}>
            <input
              type='text'
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
              placeholder={placeholder}
              disabled={isDisabled}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '20px',
                border: '2px solid #667eea',
                outline: 'none',
                fontSize: '14px',
              }}
            />
            <button
              type='button'
              onClick={onSubmit}
              disabled={isDisabled || !value.trim()}
              style={{
                padding: '10px 20px',
                borderRadius: '20px',
                border: 'none',
                background: '#667eea',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}>
              Send
            </button>
          </div>
        ),
      },
    },
  },
};

export const CustomUserMessage: Story = {
  name: 'Custom User Message',
  args: {
    onClose: () => alert('Close'),
    initialSuggestions: ['Show me summer dresses'],
    termsText: <span dangerouslySetInnerHTML={{ __html: defaultTermsHtml }} />,
    componentOverrides: {
      userMessage: {
        reactNode: ({ text }) => (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '4px 0',
            }}>
            <div
              style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: '#fff',
                borderRadius: '16px 16px 4px 16px',
                fontSize: '14px',
                maxWidth: '80%',
              }}>
              {text}
            </div>
          </div>
        ),
      },
    },
  },
};

export const CustomViewMore: Story = {
  name: 'Custom View More',
  args: {
    onClose: () => alert('Close'),
    onViewMore: (group) => alert(`View more: ${group.display_name}`),
    onProductClick: (product) => alert(`Click: ${product.name}`),
    initialSuggestions: ['Show me summer dresses'],
    termsText: <span dangerouslySetInnerHTML={{ __html: defaultTermsHtml }} />,
    aspectRatio: '3:4',
    currency: '$',
    componentOverrides: {
      resultsBlock: {
        viewMore: {
          reactNode: ({ group, onClick }) => (
            <button
              type='button'
              onClick={onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid #667eea',
                background: '#f0f4ff',
                color: '#667eea',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                marginTop: '8px',
              }}>
              See all {group.display_name} →
            </button>
          ),
        },
      },
    },
  },
};

export const CustomProductCard: Story = {
  name: 'Custom Product Card',
  args: {
    onClose: () => alert('Close'),
    onProductClick: (product) => alert(`Click: ${product.name}`),
    onAddToCart: (product) => alert(`Add to cart: ${product.name}`),
    initialSuggestions: ['Show me summer dresses'],
    termsText: <span dangerouslySetInnerHTML={{ __html: defaultTermsHtml }} />,
    aspectRatio: '3:4',
    currency: '$',
    componentOverrides: {
      resultsBlock: {
        carousel: {
          item: {
            productCard: {
              content: {
                price: {
                  reactNode: ({ product }: any) => (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '4px',
                      }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#667eea',
                        }}>
                        ${product?.price}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          background: '#eef2ff',
                          color: '#4f46e5',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}>
                        NEW
                      </span>
                    </div>
                  ),
                },
              },
              footer: {
                addToCartButton: {
                  reactNode: ({ product, onAddToCart }: any) => (
                    <button
                      type='button'
                      onClick={(e) => onAddToCart?.(e, product)}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        marginTop: '8px',
                      }}>
                      Add to bag
                    </button>
                  ),
                },
              },
            },
          },
        },
      },
    },
  },
};

