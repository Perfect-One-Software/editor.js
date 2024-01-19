import type Block from '../block';

/**
 * Fired when some block is hovered by user
 */
export const SettingsClicked = 'settings clicked';

/**
 * Payload that will be passed with the event
 */
export interface SettingsClickedPayload {
  /**
   * Hovered block
   */
  block: Block;
}
