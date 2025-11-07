import { Dropdown, DropdownMenu, including, NavListItem } from '../../../interactors';

const appContextDropdownMenu = DropdownMenu({ id: 'App_context_dropdown_menu' });
const appContextDropdown = Dropdown(including('Application context dropdown'));

export default {
  checkAppContextDropdownMenuShown(isShown = true) {
    if (isShown) cy.expect(appContextDropdownMenu.exists());
    else cy.expect(appContextDropdownMenu.absent());
  },

  toggleAppContextDropdown() {
    cy.do(appContextDropdown.toggle());
  },

  checkOptionInAppContextDropdownMenu(optionName, isShown = true) {
    const targetOption = appContextDropdownMenu.find(NavListItem({ content: optionName }));
    if (isShown) cy.expect(targetOption.exists());
    else cy.expect(targetOption.absent());
  },
};
