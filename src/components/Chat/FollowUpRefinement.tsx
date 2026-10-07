import React from 'react';
import { RenderPropsWrapper } from '@constructor-io/constructorio-ui-components';
import {
  ComponentOverrideProps,
  FollowUpRefinement as FollowUpRefinementData,
  FollowUpRefinementRenderProps,
  Translations,
} from '../../types';
import translate from '../../utils/translate';

export interface FollowUpRefinementProps {
  refinement: FollowUpRefinementData;
  onOptionClick: (option: string) => void;
  isDisabled?: boolean;
  translations?: Translations;
  componentOverrides?: ComponentOverrideProps<FollowUpRefinementRenderProps>;
}

export default function FollowUpRefinement({
  refinement,
  onOptionClick,
  isDisabled = false,
  translations,
  componentOverrides,
}: FollowUpRefinementProps) {
  const handleOptionClick = (option: string) => {
    if (isDisabled) return;
    onOptionClick(option);
  };

  const renderProps: FollowUpRefinementRenderProps = {
    question: refinement.question,
    options: refinement.options,
    onOptionClick: handleOptionClick,
    isDisabled,
  };

  return (
    <RenderPropsWrapper override={componentOverrides?.reactNode} props={renderProps}>
      <div
        className={[
          'cio-asa-follow-up-refinement',
          isDisabled && 'cio-asa-follow-up-refinement--disabled',
        ]
          .filter(Boolean)
          .join(' ')}
        role='group'
        aria-label={translate('CioAsa.refinement.ariaLabel', translations)}>
        <p className='cio-asa-follow-up-refinement__question'>{refinement.question}</p>
        <div className='cio-asa-follow-up-refinement__options'>
          {refinement.options.map((option) => (
            <button
              key={option}
              type='button'
              className='cio-asa-follow-up-refinement__chip'
              disabled={isDisabled}
              onClick={() => handleOptionClick(option)}>
              {option}
            </button>
          ))}
        </div>
      </div>
    </RenderPropsWrapper>
  );
}

FollowUpRefinement.displayName = 'FollowUpRefinement';
