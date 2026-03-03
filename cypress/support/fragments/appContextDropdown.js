import {
  Button,
  Dropdown,
  DropdownMenu,
  including,
  Modal,
  MultiColumnListRow,
  NavListItem,
  HTML,
  and,
} from '../../../interactors';

const appContextDropdownMenu = DropdownMenu({ id: 'App_context_dropdown_menu' });
const appContextDropdown = Dropdown(including('Application context dropdown'));
const appContextDropdownButton = Button(including('Application context dropdown'));
const keyboardShortcutsModal = Modal('Keyboard shortcuts');
const closeIcon = Button({ icon: 'times' });
const closeKeyboardShortcutsModalButton = keyboardShortcutsModal.find(
  Button({ id: 'keyboard-shortcuts-modal-close' }),
);

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

  verifyInventoryDropdownIsShown(isOpen = true) {
    cy.expect(appContextDropdown.find(appContextDropdownButton).has({ ariaExpanded: `${isOpen}` }));
  },

  verifyShortcutsModalContent(shortcutList) {
    shortcutList.forEach(([action, keys]) => {
      cy.expect(
        keyboardShortcutsModal
          .find(MultiColumnListRow(and(including(action), including(keys))))
          .exists(),
      );
    });
    cy.expect([
      keyboardShortcutsModal.find(closeIcon).exists(),
      closeKeyboardShortcutsModalButton.exists(),
    ]);
  },

  closeShortcutsViaIcon: () => cy.do(keyboardShortcutsModal.find(closeIcon).click()),
};
