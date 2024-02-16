import Module from '../../__module';
import $ from '../../dom';
import * as _ from '../../utils';
import I18n from '../../i18n';
import { I18nInternalNS } from '../../i18n/namespace-internal';
import * as tooltip from '../../utils/tooltip';
import { ModuleConfig } from '../../../types-internal/module-config';
import Block from '../../block';
import { BlockHovered } from '../../events/BlockHovered';
import { SettingsClicked } from '../../events/SettingsClicked';
import { beautifyShortcut } from '../../utils';

/**
 * @todo Tab on non-empty block should open Block Settings of the hoveredBlock (not where caret is set)
 *          - make Block Settings a standalone module
 * @todo - Keyboard-only mode bug:
 *         press Tab, flip to the Checkbox. press Enter (block will be added), Press Tab
 *         (Block Tunes will be opened with Move up focused), press Enter, press Tab ———— both Block Tunes and Toolbox will be opened
 * @todo TEST CASE - show toggler after opening and closing the Inline ConfigToolbar
 * @todo TEST CASE - Click outside Editor holder should close ConfigToolbar and Clear Focused blocks
 * @todo TEST CASE - Click inside Editor holder should close ConfigToolbar and Clear Focused blocks
 * @todo TEST CASE - Click inside Redactor zone when Block Settings are opened:
 *                  - should close Block Settings
 *                  - should not close ConfigToolbar
 *                  - should move ConfigToolbar to the clicked Block
 * @todo TEST CASE - ConfigToolbar should be closed on the Cross Block Selection
 * @todo TEST CASE - ConfigToolbar should be closed on the Rectangle Selection
 * @todo TEST CASE - If Block Settings or Toolbox are opened, the ConfigToolbar should not be moved by Bocks hovering
 */

/**
 * HTML Elements used for ConfigToolbar UI
 */
interface ToolbarNodes {
  wrapper: HTMLElement | undefined;
  content: HTMLElement | undefined;
  actions: HTMLElement | undefined;

  plusButton: HTMLElement | undefined;
  settingsToggler: HTMLElement | undefined;
}
/**
 *
 * «ConfigToolbar» is the node that moves up/down over current block
 *
 *  ______________________________________ ConfigToolbar ____________________________________________
 * |                                                                                           |
 * |  ..................... Content .........................................................  |
 * |  .                                                   ........ Block Actions ...........   |
 * |  .                                                   .        [Open Settings]         .   |
 * |  .  [Plus Button]  [Toolbox: {Tool1}, {Tool2}]       .                                .   |
 * |  .                                                   .        [Settings Panel]        .   |
 * |  .                                                   ..................................   |
 * |  .......................................................................................  |
 * |                                                                                           |
 * |___________________________________________________________________________________________|
 *
 *
 * Toolbox — its an Element contains tools buttons. Can be shown by Plus Button.
 *
 *  _______________ Toolbox _______________
 * |                                       |
 * | [Header] [Image] [List] [Quote] ...   |
 * |_______________________________________|
 *
 *
 * Settings Panel — is an Element with block settings:
 *
 *   ____ Settings Panel ____
 *  | ...................... |
 *  | .   Tool Settings    . |
 *  | ...................... |
 *  | .  Default Settings  . |
 *  | ...................... |
 *  |________________________|
 *
 *
 * @class
 * @classdesc ConfigToolbar module
 * @typedef {ConfigToolbar} ConfigToolbar
 * @property {object} nodes - ConfigToolbar nodes
 * @property {Element} nodes.wrapper        - ConfigToolbar main element
 * @property {Element} nodes.content        - Zone with Plus button and toolbox.
 * @property {Element} nodes.actions        - Zone with Block Settings and Remove Button
 * @property {Element} nodes.blockActionsButtons   - Zone with Block Buttons: [Settings]
 * @property {Element} nodes.plusButton     - Button that opens or closes Toolbox
 * @property {Element} nodes.toolbox        - Container for tools
 * @property {Element} nodes.settingsToggler - open/close Settings Panel button
 * @property {Element} nodes.settings          - Settings Panel
 * @property {Element} nodes.pluginSettings    - Plugin Settings section of Settings Panel
 * @property {Element} nodes.defaultSettings   - Default Settings section of Settings Panel
 */
export default class ConfigToolbar extends Module<ToolbarNodes> {
  /**
   * Block near which we display the Toolbox
   */
  private hoveredBlock: Block;

  /**
   * @class
   * @param moduleConfiguration - Module Configuration
   * @param moduleConfiguration.config - Editor's config
   * @param moduleConfiguration.eventsDispatcher - Editor's event dispatcher
   */
  constructor({ config, eventsDispatcher }: ModuleConfig) {
    super({
      config,
      eventsDispatcher,
    });
  }

  /**
   * CSS styles
   *
   * @returns {object}
   */
  public get CSS(): { [name: string]: string } {
    return {
      toolbar: 'ce-config-toolbar',
      content: 'ce-config-toolbar__content',
      actions: 'ce-config-toolbar__actions',
      actionsOpened: 'ce-config-toolbar__actions--opened',

      toolbarOpened: 'ce-config-toolbar--opened',
      openedToolboxHolderModifier: 'codex-editor--toolbox-opened',

      settingsToggler: 'ce-config-toolbar__settings-btn',
      settingsTogglerHidden: 'ce-config-toolbar__settings-btn--hidden',
    };
  }

  /**
   * Returns the ConfigToolbar opening state
   *
   * @returns {boolean}
   */
  public get opened(): boolean {
    return this.nodes.wrapper.classList.contains(this.CSS.toolbarOpened);
  }

  /**
   * Block actions appearance manipulations
   */
  private get blockActions(): { hide: () => void; show: () => void } {
    return {
      hide: (): void => {
        this.nodes.actions.classList.remove(this.CSS.actionsOpened);
      },
      show: (): void => {
        this.nodes.actions.classList.add(this.CSS.actionsOpened);
      },
    };
  }

  /**
   * Methods for working with Block Tunes toggler
   */
  private get blockTunesToggler(): { hide: () => void; show: () => void } {
    return {
      hide: (): void => this.nodes.settingsToggler.classList.add(this.CSS.settingsTogglerHidden),
      show: (): void => this.nodes.settingsToggler.classList.remove(this.CSS.settingsTogglerHidden),
    };
  }

  /**
   * Toggles read-only mode
   *
   * @param {boolean} readOnlyEnabled - read-only mode
   */
  public toggleReadOnly(readOnlyEnabled: boolean): void {
    if (!readOnlyEnabled && !(this.config.hideConfigToolbar ?? true)) {
      window.requestIdleCallback(() => {
        this.drawUI();
        this.enableModuleBindings();
      }, { timeout: 2000 });
    } else {
      this.destroy();
      this.disableModuleBindings();
    }
  }

  /**
   * Move ConfigToolbar to the passed (or current) Block
   *
   * @param block - block to move ConfigToolbar near it
   */
  public moveAndOpen(block: Block = this.Editor.BlockManager.currentBlock): void {
    /**
     * If no one Block selected as a Current
     */
    if (!block || !this.nodes.wrapper) {
      return;
    }

    this.hoveredBlock = block;

    const targetBlockHolder = block.holder;
    const { isMobile } = this.Editor.UI;
    const renderedContent = block.pluginsContent;
    const renderedContentStyle = window.getComputedStyle(renderedContent);
    const blockRenderedElementPaddingTop = parseInt(renderedContentStyle.paddingTop, 10);
    const blockHeight = targetBlockHolder.offsetHeight;

    let toolbarY;

    /**
     * On mobile — ConfigToolbar at the bottom of Block
     * On Desktop — ConfigToolbar should be moved to the first line of block text
     *              To do that, we compute the block offset and the padding-top of the plugin content
     */
    if (isMobile) {
      toolbarY = targetBlockHolder.offsetTop + blockHeight;
    } else {
      toolbarY = targetBlockHolder.offsetTop + blockRenderedElementPaddingTop;
    }

    /**
     * Move ConfigToolbar to the Top coordinate of Block
     */
    this.nodes.wrapper.style.top = `${Math.floor(toolbarY)}px`;

    /**
     * Do not show Block Tunes Toggler near single and empty block
     */
    if (this.Editor.BlockManager.blocks.length === 1 && block.isEmpty) {
      this.blockTunesToggler.hide();
    } else {
      this.blockTunesToggler.show();
    }

    this.open();
  }

  /**
   * Close the ConfigToolbar
   */
  public close(): void {
    if (this.Editor.ReadOnly.isEnabled) {
      return;
    }

    this.nodes.wrapper?.classList.remove(this.CSS.toolbarOpened);

    /** Close components */
    this.blockActions.hide();
    this.reset();
  }

  public activate(block: Block): void {
    this.emitBlockSettingsClicked(block);
  }

  /**
   * Reset the ConfigToolbar position to prevent DOM height growth, for example after blocks deletion
   */
  private reset(): void {
    this.nodes.wrapper.style.top = 'unset';
  }

  /**
   * Open ConfigToolbar with Plus Button and Actions
   *
   * @param {boolean} withBlockActions - by default, ConfigToolbar opens with Block Actions.
   *                                     This flag allows to open ConfigToolbar without Actions.
   */
  private open(withBlockActions = true): void {
    this.nodes.wrapper.classList.add(this.CSS.toolbarOpened);

    if (withBlockActions) {
      this.blockActions.show();
    } else {
      this.blockActions.hide();
    }
  }

  /**
   * Draws ConfigToolbar elements
   */
  private make(): void {
    this.nodes.wrapper = $.make('div', this.CSS.toolbar);

    /**
     * Make Content Zone and Actions Zone
     */
    ['content', 'actions'].forEach((el) => {
      this.nodes[el] = $.make('div', this.CSS[el]);
    });
    /**
     * Actions will be included to the toolbar content so we can align in to the right of the content
     */
    $.append(this.nodes.wrapper, this.nodes.content);
    $.append(this.nodes.content, this.nodes.actions);

    /**
     * Fill Actions Zone:
     *  - Settings Toggler
     *  - Remove Block Button
     *  - Settings Panel
     */
    this.nodes.settingsToggler = $.make('span', this.CSS.settingsToggler, {
      innerHTML: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="none"> <path d="M8.325 2.317C8.751 0.561 11.249 0.561 11.675 2.317C11.7389 2.5808 11.8642 2.82578 12.0407 3.032C12.2172 3.23822 12.4399 3.39985 12.6907 3.50375C12.9414 3.60764 13.2132 3.65085 13.4838 3.62987C13.7544 3.60889 14.0162 3.5243 14.248 3.383C15.791 2.443 17.558 4.209 16.618 5.753C16.4769 5.98466 16.3924 6.24634 16.3715 6.51677C16.3506 6.78721 16.3938 7.05877 16.4975 7.30938C16.6013 7.55999 16.7627 7.78258 16.9687 7.95905C17.1747 8.13553 17.4194 8.26091 17.683 8.325C19.439 8.751 19.439 11.249 17.683 11.675C17.4192 11.7389 17.1742 11.8642 16.968 12.0407C16.7618 12.2172 16.6001 12.4399 16.4963 12.6907C16.3924 12.9414 16.3491 13.2132 16.3701 13.4838C16.3911 13.7544 16.4757 14.0162 16.617 14.248C17.557 15.791 15.791 17.558 14.247 16.618C14.0153 16.4769 13.7537 16.3924 13.4832 16.3715C13.2128 16.3506 12.9412 16.3938 12.6906 16.4975C12.44 16.6013 12.2174 16.7627 12.0409 16.9687C11.8645 17.1747 11.7391 17.4194 11.675 17.683C11.249 19.439 8.751 19.439 8.325 17.683C8.26108 17.4192 8.13578 17.1742 7.95929 16.968C7.7828 16.7618 7.56011 16.6001 7.30935 16.4963C7.05859 16.3924 6.78683 16.3491 6.51621 16.3701C6.24559 16.3911 5.98375 16.4757 5.752 16.617C4.209 17.557 2.442 15.791 3.382 14.247C3.5231 14.0153 3.60755 13.7537 3.62848 13.4832C3.64942 13.2128 3.60624 12.9412 3.50247 12.6906C3.3987 12.44 3.23726 12.2174 3.03127 12.0409C2.82529 11.8645 2.58056 11.7391 2.317 11.675C0.561 11.249 0.561 8.751 2.317 8.325C2.5808 8.26108 2.82578 8.13578 3.032 7.95929C3.23822 7.7828 3.39985 7.56011 3.50375 7.30935C3.60764 7.05859 3.65085 6.78683 3.62987 6.51621C3.60889 6.24559 3.5243 5.98375 3.383 5.752C2.443 4.209 4.209 2.442 5.753 3.382C6.753 3.99 8.049 3.452 8.325 2.317Z" stroke="#7A7A7A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/> <path d="M7 10C7 10.7956 7.31607 11.5587 7.87868 12.1213C8.44129 12.6839 9.20435 13 10 13C10.7956 13 11.5587 12.6839 12.1213 12.1213C12.6839 11.5587 13 10.7956 13 10C13 9.20435 12.6839 8.44129 12.1213 7.87868C11.5587 7.31607 10.7956 7 10 7C9.20435 7 8.44129 7.31607 7.87868 7.87868C7.31607 8.44129 7 9.20435 7 10Z" stroke="#7A7A7A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/> </svg>',
    });

    $.append(this.nodes.actions, this.nodes.settingsToggler);

    const blockTunesTooltip = $.make('div');
    const blockTunesTooltipEl = $.text(I18n.ui(I18nInternalNS.ui.configToolbar.toolbox, 'Open'));

    blockTunesTooltip.appendChild(blockTunesTooltipEl);
    blockTunesTooltip.appendChild($.make('div', this.CSS.plusButtonShortcut, {
      textContent: beautifyShortcut('CMD + C'),
    }));

    tooltip.onHover(this.nodes.settingsToggler, blockTunesTooltip, {
      hidingDelay: 400,
    });

    /**
     * Append toolbar to the Editor
     */
    $.append(this.Editor.UI.nodes.wrapper, this.nodes.wrapper);
  }

  /**
   * Enable bindings
   */
  private enableModuleBindings(): void {
    /**
     * Settings toggler
     *
     * mousedown is used because on click selection is lost in Safari and FF
     */
    this.readOnlyMutableListeners.on(this.nodes.settingsToggler, 'mousedown', (e) => {
      /**
       * Stop propagation to prevent block selection clearance
       *
       * @see UI.documentClicked
       */
      e.stopPropagation();

      this.settingsToggleClicked();

      tooltip.hide(true);
    }, true);

    /**
     * Subscribe to the 'block-hovered' event if current view is not mobile
     *
     * @see https://github.com/codex-team/editor.js/issues/1972
     */
    if (!_.isMobileScreen()) {
      /**
       * Subscribe to the 'block-hovered' event
       */
      this.eventsDispatcher.on(BlockHovered, (data) => {
        this.moveAndOpen(data.block);
      });
    }
  }

  /**
   * Disable bindings
   */
  private disableModuleBindings(): void {
    this.readOnlyMutableListeners.clearAll();
  }

  /**
   * Clicks on the Block Settings toggler
   */
  private settingsToggleClicked(): void {
    /**
     * We need to update Current Block because user can click on toggler (thanks to appearing by hover) without any clicks on editor
     * In this case currentBlock will point last block
     */
    this.Editor.BlockManager.currentBlock = this.hoveredBlock;
    this.emitBlockSettingsClicked(this.hoveredBlock);
  }

  private emitBlockSettingsClicked(block: Block): void {
    this.eventsDispatcher.emit(SettingsClicked, { block });
  }

  /**
   * Draws ConfigToolbar UI
   *
   * ConfigToolbar contains BlockSettings and Toolbox.
   * That's why at first we draw its components and then ConfigToolbar itself
   *
   * Steps:
   *  - Make ConfigToolbar dependent components like BlockSettings, Toolbox and so on
   *  - Make itself and append dependent nodes to itself
   *
   */
  private drawUI(): void {
    /**
     * Make ConfigToolbar
     */
    this.make();
  }

  /**
   * Removes all created and saved HTMLElements
   * It is used in Read-Only mode
   */
  private destroy(): void {
    this.removeAllNodes();
  }
}
