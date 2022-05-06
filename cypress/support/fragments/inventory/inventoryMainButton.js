import { Button, Dropdown, Modal } from '../../../../interactors';

const dropDown = Dropdown('InventoryApplication context dropdown');

export default {
  verifyInventoryDropdownIsShown(isOpen) {
    // isOpen: string with bool value
    cy.expect(dropDown.find(Button('Inventory\nApplication context dropdown')).has({ ariaExpanded: isOpen }));
  },
  openInventoryMenu() {
    cy.do(dropDown.open());
  },
  openShortcuts() {
    cy.do(dropDown.choose('Keyboard shortcuts'));
  },
  waitModalLoading(modalName) {
    cy.expect(Modal(modalName).exists());
  },
};
