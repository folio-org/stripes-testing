import { Dropdown, DropdownMenu, including, Modal, NavListItem, HTML } from '../../../interactors';

const appContextDropdownMenu = DropdownMenu({ id: 'App_context_dropdown_menu' });
const appContextDropdown = Dropdown(including('Application context dropdown'));
const keyboardShortcutsModal = Modal('Keyboard shortcuts');

export default {
  checkAppContextDropdownMenuShown(isShown = true) {
    if (isShown) {
      cy.expect([
        appContextDropdownMenu.exists(),
        appContextDropdown.find(HTML({ classList: including('icon-caret-up') })).exists(),
      ]);
    } else {
      cy.expect([
        appContextDropdownMenu.absent(),
        appContextDropdown.find(HTML({ classList: including('icon-caret-down') })).exists(),
      ]);
    }
  },

  toggleAppContextDropdown() {
    cy.do(appContextDropdown.toggle());
  },

  checkOptionInAppContextDropdownMenu(
    optionName,
    isShown = true,
    { checkOpensNewTab = false, linkPart = null } = {},
  ) {
    const targetOption = appContextDropdownMenu.find(NavListItem({ content: optionName }));
    if (isShown) {
      cy.expect(targetOption.exists());
      if (checkOpensNewTab) cy.expect(targetOption.has({ opensNewTab: true }));
      if (linkPart) cy.expect(targetOption.has({ href: including(linkPart) }));
    } else cy.expect(targetOption.absent());
  },

  clickOptionInAppContextDropdownMenu(optionName) {
    const targetOption = appContextDropdownMenu.find(NavListItem({ content: optionName }));
    cy.do(targetOption.click());
  },

  verifyKeyboardShortcutsModalShown(isShown = true) {
    if (isShown) cy.expect(keyboardShortcutsModal.exists());
    else cy.expect(keyboardShortcutsModal.absent());
  },
};
