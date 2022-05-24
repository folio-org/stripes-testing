import { Button, Dropdown, Modal, Select, TextArea } from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';

const inventoryApplicationContextDropdown = Dropdown('InventoryApplication context dropdown');
const instanceTitle = `Instance_Test_Title_${getRandomPostfix()}`;

export default {
  verifyInventoryDropdownIsShown(isOpen) {
    // isOpen: string with bool value
    cy.expect(inventoryApplicationContextDropdown.find(Button('Inventory\nApplication context dropdown'))
      .has({ ariaExpanded: isOpen }));
  },
  openInventoryMenu() {
    cy.do(inventoryApplicationContextDropdown.open());
  },
  openShortcuts() {
    cy.do(inventoryApplicationContextDropdown.choose('Keyboard shortcuts'));
  },
  waitModalLoading(modalName) {
    cy.expect(Modal(modalName).exists());
  },
  pressHotKey(hotKey) {
    cy.get('body').type(hotKey);
  },
  closeShortcuts() {
    cy.do(Modal({ id: 'keyboard-shortcuts-modal' }).find(Button({ id: 'keyboard-shortcuts-modal-close' })).click());
  },
  fillInstanceInfo:() => {
    cy.do([
      TextArea({ name: 'title' }).fillIn(instanceTitle),
      Select({ name: 'instanceTypeId' }).choose('other'),
      Button('Save and close').click(),
    ]);
  },
};
