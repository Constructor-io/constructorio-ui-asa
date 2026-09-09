import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import FollowUpRefinement from '../../../src/components/Chat/FollowUpRefinement';

const refinement = {
  question: 'Who are you shopping for?',
  options: ["Women's styles", "Men's styles", 'Kids and baby'],
};

describe('FollowUpRefinement', () => {
  it('renders the question and one chip per option', () => {
    render(<FollowUpRefinement refinement={refinement} onOptionClick={jest.fn()} />);
    expect(screen.getByText('Who are you shopping for?')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: "Men's styles" })).toBeInTheDocument();
  });

  it('labels the chip group for screen readers', () => {
    render(<FollowUpRefinement refinement={refinement} onOptionClick={jest.fn()} />);
    expect(screen.getByRole('group', { name: 'Refine your results' })).toBeInTheDocument();
  });

  it('uses the translated group label', () => {
    render(
      <FollowUpRefinement
        refinement={refinement}
        onOptionClick={jest.fn()}
        translations={{ 'CioAsa.refinement.ariaLabel': 'Narrow results' }}
      />,
    );
    expect(screen.getByRole('group', { name: 'Narrow results' })).toBeInTheDocument();
  });

  it('calls onOptionClick with the option text', async () => {
    const onOptionClick = jest.fn();
    render(<FollowUpRefinement refinement={refinement} onOptionClick={onOptionClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Kids and baby' }));
    expect(onOptionClick).toHaveBeenCalledWith('Kids and baby');
  });

  it('is keyboard operable', async () => {
    const onOptionClick = jest.fn();
    render(<FollowUpRefinement refinement={refinement} onOptionClick={onOptionClick} />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: "Women's styles" })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onOptionClick).toHaveBeenCalledWith("Women's styles");
  });

  it('disables every chip and ignores clicks when isDisabled', async () => {
    const onOptionClick = jest.fn();
    render(<FollowUpRefinement refinement={refinement} onOptionClick={onOptionClick} isDisabled />);
    screen.getAllByRole('button').forEach((chip) => expect(chip).toBeDisabled());
    await userEvent.click(screen.getByRole('button', { name: "Men's styles" }));
    expect(onOptionClick).not.toHaveBeenCalled();
  });

  it('supports a component override with render props', () => {
    const onOptionClick = jest.fn();
    render(
      <FollowUpRefinement
        refinement={refinement}
        onOptionClick={onOptionClick}
        isDisabled
        componentOverrides={{
          reactNode: ({ question, options, isDisabled }) => (
            <div data-testid='custom'>
              {question} / {options.length} / {String(isDisabled)}
            </div>
          ),
        }}
      />,
    );
    expect(screen.getByTestId('custom')).toHaveTextContent('Who are you shopping for? / 3 / true');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has no a11y violations', async () => {
    const { container } = render(
      <FollowUpRefinement refinement={refinement} onOptionClick={jest.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
