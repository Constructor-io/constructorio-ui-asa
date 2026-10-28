import React from 'react';
import { CheckoutTrigger, CheckoutTriggerState, Translations } from '../../types';
import translate from '../../utils/translate';

export interface CheckoutTriggerBarProps {
  triggers: CheckoutTrigger[];
  state: CheckoutTriggerState;
  translations?: Translations;
}

export default function CheckoutTriggerBar({
  triggers,
  state,
  translations,
}: CheckoutTriggerBarProps) {
  const visible = triggers.filter((trigger) => trigger.triggerWhen?.(state) ?? true);
  if (visible.length === 0) return null;

  return (
    <div
      className='cio-asa-checkout-triggers'
      role='group'
      aria-label={translate('CioAsa.checkout.ariaLabel', translations)}>
      {visible.map((trigger) => {
        const label = trigger.label ?? translate('CioAsa.checkout.triggerLabel', translations);
        const onClick = () => trigger.onTrigger(state);
        if (trigger.renderButton) {
          return (
            <React.Fragment key={trigger.id}>
              {trigger.renderButton({ onClick, label, disabled: trigger.disabled, id: trigger.id })}
            </React.Fragment>
          );
        }
        return (
          <button
            key={trigger.id}
            type='button'
            className='cio-asa-checkout-trigger'
            disabled={trigger.disabled}
            onClick={onClick}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

CheckoutTriggerBar.displayName = 'CheckoutTriggerBar';
