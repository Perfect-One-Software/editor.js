/**
 * @class MoveDownTune
 * @classdesc Editor's default tune - Moves down highlighted block
 * @copyright <CodeX Team> 2018
 */

import { API, BlockTune } from '../../../types';
import { TunesMenuConfig } from '../../../types/tools';


/**
 *
 */
export default class MoveDownTune implements BlockTune {
  /**
   * Set Tool is Tune
   */
  public static readonly isTune = true;

  /**
   * Property that contains Editor.js API methods
   *
   * @see {@link docs/api.md}
   */
  private readonly api: API;

  /**
   * Styles
   */
  private CSS = {
    animation: 'wobble',
  };

  /**
   * MoveDownTune constructor
   *
   * @param {API} api — Editor's API
   */
  constructor({ api }) {
    this.api = api;
  }

  /**
   * Tune's appearance in block settings menu
   */
  public render(): TunesMenuConfig {
    return {
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11v10m-3-3l3 3l3-3M10 5a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/></svg>',
      title: this.api.i18n.t('Move down'),
      onActivate: (): void => this.handleClick(),
      name: 'move-down',
    };
  }

  /**
   * Handle clicks on 'move down' button
   */
  public handleClick(): void {
    const currentBlockIndex = this.api.blocks.getCurrentBlockIndex();
    const nextBlock = this.api.blocks.getBlockByIndex(currentBlockIndex + 1);

    // If Block is last do nothing
    if (!nextBlock) {
      throw new Error('Unable to move Block down since it is already the last');
    }

    const nextBlockElement = nextBlock.holder;
    const nextBlockCoords = nextBlockElement.getBoundingClientRect();

    let scrollOffset = Math.abs(window.innerHeight - nextBlockElement.offsetHeight);

    /**
     * Next block ends on screen.
     * Increment scroll by next block's height to save element onscreen-position
     */
    if (nextBlockCoords.top < window.innerHeight) {
      scrollOffset = window.scrollY + nextBlockElement.offsetHeight;
    }

    window.scrollTo(0, scrollOffset);

    /** Change blocks positions */
    this.api.blocks.move(currentBlockIndex + 1);

    this.api.toolbar.toggleBlockSettings(true);
  }
}
