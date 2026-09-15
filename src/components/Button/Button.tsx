import React, { useCallback } from 'react';
import { Button as CioButton } from '@constructor-io/constructorio-ui-components';
import { ChatBubbleDarkIcon, ChatBubbleLightIcon } from '../icons';
import { useCioAsaContext } from '../../hooks/useCioAsaContext';
import useAsaTracking from '../../hooks/useAsaTracking';
import { AgentButtonClickPlacement } from '../../types';

const AGENT_BUTTON_CLICK_MODE = 'chat';

export interface ButtonProps extends AgentButtonClickPlacement {
  /** Color scheme: dark (for light backgrounds) or light (for dark backgrounds) */
  theme?: 'dark' | 'light';
  /** Button size: sm (small) or lg (large) */
  size?: 'sm' | 'lg';
  /** Click handler */
  onClick?: () => void;
  /** Button label text */
  label?: string;
}

export default function Button({
  theme = 'dark',
  size = 'sm',
  onClick,
  label = 'Shopping assistant',
  positionOnPage,
  pageType,
  instanceId,
}: ButtonProps) {
  const context = useCioAsaContext();
  const domain = context?.staticRequestConfigs?.domain;
  const tracking = useAsaTracking({
    tracker: context?.cioClient?.tracker ?? undefined,
    section: context?.section,
  });

  const handleClick = useCallback(() => {
    if (domain) {
      const payload = {
        mode: AGENT_BUTTON_CLICK_MODE,
        domain,
        ...(positionOnPage && { positionOnPage }),
        ...(pageType && { pageType }),
        ...(instanceId && { instanceId }),
      };
      tracking.trackAgentButtonClick(payload);
      context?.callbacks?.onAgentButtonClick?.(payload);
    }
    onClick?.();
  }, [domain, positionOnPage, pageType, instanceId, tracking, context, onClick]);

  return (
    <CioButton
      className={`cio-asa-button cio-asa-button--${theme} cio-asa-button--${size}`}
      size={size === 'lg' ? 'default' : 'sm'}
      onClick={handleClick}>
      {theme === 'dark' ? <ChatBubbleDarkIcon /> : <ChatBubbleLightIcon />}
      <span className='cio-asa-button__label'>{label}</span>
    </CioButton>
  );
}
