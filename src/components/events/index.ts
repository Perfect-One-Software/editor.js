import { RedactorDomChanged, RedactorDomChangedPayload } from './RedactorDomChanged';
import { BlockChanged, BlockChangedPayload } from './BlockChanged';
import { BlockHovered, BlockHoveredPayload } from './BlockHovered';
import { SettingsClicked, SettingsClickedPayload } from './SettingsClicked';
import { FakeCursorAboutToBeToggled, FakeCursorAboutToBeToggledPayload } from './FakeCursorAboutToBeToggled';
import { FakeCursorHaveBeenSet, FakeCursorHaveBeenSetPayload } from './FakeCursorHaveBeenSet';

/**
 * Events fired by Editor Event Dispatcher
 */
export {
  RedactorDomChanged,
  BlockChanged,
  FakeCursorAboutToBeToggled,
  FakeCursorHaveBeenSet
};

/**
 * Event name -> Event payload
 */
export interface EditorEventMap {
  [SettingsClicked]: SettingsClickedPayload;
  [BlockHovered]: BlockHoveredPayload;
  [RedactorDomChanged]: RedactorDomChangedPayload;
  [BlockChanged]: BlockChangedPayload;
  [FakeCursorAboutToBeToggled]: FakeCursorAboutToBeToggledPayload;
  [FakeCursorHaveBeenSet]: FakeCursorHaveBeenSetPayload;
}
