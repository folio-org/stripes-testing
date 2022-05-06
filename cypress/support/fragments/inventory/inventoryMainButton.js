import { Button, Dropdown, Modal } from '../../../../interactors';

const inventoryApplicationContextDropdown = Dropdown('InventoryApplication context dropdown');

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
};
