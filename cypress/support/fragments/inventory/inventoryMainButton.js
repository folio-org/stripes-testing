import { Button, Dropdown, Modal } from '../../../../interactors';

export default {
  verifyInventoryDropdownIsShown(isOpen) {
    // isOpen: string with bool value
    cy.do(Dropdown('InventoryApplication context dropdown').find(Button('Inventory\nApplication context dropdown'))
      .perform(element => {
        expect(element).to.have.attr('aria-expanded', isOpen);
      }));
  },
  openInventoryMenu() {
    cy.do(Dropdown('InventoryApplication context dropdown').open());
  },
  openShortcuts() {
    cy.do(Dropdown('InventoryApplication context dropdown').choose('Keyboard shortcuts'));
  },
  verifyInventoryModalName(title) {
    cy.expect(Modal().has({ title }));
  }
};
