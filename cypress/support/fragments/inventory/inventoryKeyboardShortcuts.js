import {
  Button,
  Dropdown,
  Modal,
  HTML,
  including,
  Select,
  TextArea,
  Section,
} from '../../../../interactors';
import InventoryHotkeys from './inventoryHotkeys';
import QuickMarcEditor from '../quickMarcEditor';

const inventoryApplicationContextDropdown = Dropdown('InventoryApplication context dropdown');
const keyboardShortcutModal = Modal({ id: 'keyboard-shortcuts-modal' });
const closeKeyboardShortcutModalButton = keyboardShortcutModal.find(
  Button({ id: 'keyboard-shortcuts-modal-close' }),
);
const hotKeys = InventoryHotkeys.hotKeys;

export default {
  verifyInventoryDropdownIsShown(isOpen) {
    // isOpen: string with bool value
    cy.expect(
      inventoryApplicationContextDropdown
        .find(Button('Inventory\nApplication context dropdown'))
        .has({ ariaExpanded: isOpen }),
    );
  },
  openInventoryMenu() {
    cy.do(inventoryApplicationContextDropdown.open());
  },
  verifyInventoryDropdownExists: () => cy.expect(inventoryApplicationContextDropdown.exists()),
  verifyInventoryDrowdownOptions() {
    cy.expect([
      inventoryApplicationContextDropdown.find(HTML(including('Keyboard shortcuts'))).exists(),
      inventoryApplicationContextDropdown.find(HTML(including('Inventory app search'))).exists(),
    ]);
  },
  verifyCloseKeyboardShortcutsModalButtonIsActive: () => closeKeyboardShortcutModalButton.has({ disabled: false }),
  openInventoryAppSearch() {
    cy.do(inventoryApplicationContextDropdown.choose('Inventory app search'));
  },
  openShortcuts() {
    cy.do(inventoryApplicationContextDropdown.choose('Keyboard shortcuts'));
  },
  waitModalLoading(modalName) {
    cy.expect(Modal(modalName).exists());
  },
  pressHotKey(hotKey) {
    cy.wait(6000);
    cy.get('body').type(hotKey);
  },
  closeShortcuts: () => cy.do(closeKeyboardShortcutModalButton.click()),
  fillInstanceInfoAndSave: (instanceTitle) => {
    cy.do([
      TextArea({ name: 'title' }).fillIn(instanceTitle),
      Select({ name: 'instanceTypeId' }).choose('other'),
      Button('Save & close').click(),
    ]);
  },
  checkInstance: (instanceTitle) => {
    cy.expect(
      Section({ id: 'pane-instancedetails' })
        .find(HTML(including(instanceTitle, { class: 'headline' })))
        .exists(),
    );
  },
  moveCursorBetweenSubfieldsAndCheck(rowNumber) {
    this.pressHotKey(hotKeys.moveToPreviousSubfield);
    cy.get(`[name="records[${rowNumber}].content"]`).type('{insert} the first subfield is: ');
    this.pressHotKey(hotKeys.moveToNextSubfield);
    cy.get(`[name="records[${rowNumber}].content"]`).type('{insert} the second subfield is: ');
    QuickMarcEditor.checkContent(
      '$a  the first subfield is: test5 $a  the second subfield is: test6',
      6,
    );
  },
};
