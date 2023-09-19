import {
  Button,
  Pane,
  MultiColumnListCell,
  Accordion,
  PaneContent,
  Modal,
  SearchField,
  HTML,
} from '../../../../interactors';
import TopMenu from '../topMenu';

const userSearchPane = Pane('User search');
const editUserPane = Pane('Edit');
const userDetailsPane = Pane({ id: 'pane-userdetails' });
const activeStatusCheckboxId = '#clickable-filter-active-active';
const resultsPaneContent = PaneContent({ id: 'users-search-results-pane-content' });
const editOption = Button('Edit');
const userPermissionsAccordion = Accordion({ id: 'permissions' });
const addPermissionButton = Button('Add permission');
const selectPermissionsModal = Modal({ id: 'permissions-modal' });
const permissionsSearch = SearchField();
const searchButton = Button('Search');
const resetAllButton = Button('Reset all');
const actionsButtonLocator =
  '#paneHeaderpane-userdetails > .last---PgcVW > .paneMenu---DWlKD > .dropdown---MS9PB';
let totalRows;

export default {
  openUsersMenu() {
    cy.visit(TopMenu.usersPath);
    cy.expect(userSearchPane.exists());
  },

  selectActiveStatus() {
    cy.get(activeStatusCheckboxId).check();
    cy.expect(resultsPaneContent.exists());
  },

  openUsersProfile() {
    cy.get('[role="gridcell"]>a').then((elements) => {
      const lastEl = elements[elements.length - 1];
      lastEl.click();
    });
  },

  verifyUserDetailsPane() {
    cy.expect(userDetailsPane.exists());
  },

  goToEditPage() {
    cy.get(actionsButtonLocator).click();
    cy.do(editOption.click());
    cy.expect(editUserPane.exists());
  },

  verifyUserPermissionsAccordion() {
    cy.expect(userPermissionsAccordion.exists());
    cy.expect(userPermissionsAccordion.has({ open: false }));
  },

  openSelectPermissions() {
    cy.get('#accordion-toggle-button-permissions').scrollIntoView();
    cy.do(userPermissionsAccordion.clickHeader());
    cy.do(addPermissionButton.click());
    cy.expect(selectPermissionsModal.exists());
    this.permissionsCount();
  },

  searchForPermission(permission) {
    cy.do(permissionsSearch.fillIn(permission));
    cy.do(searchButton.click());
  },

  verifyPermissionsFiltered(permission) {
    cy.get('#list-permissions')
      .invoke('attr', 'aria-rowcount')
      .then((rowCount) => {
        for (let i = 0; i < rowCount - 1; i++) {
          const statusField = MultiColumnListCell({ row: i, columnIndex: 1 });
          cy.expect(statusField.has({ content: permission[i] }));
        }
      });
  },

  resetAll() {
    cy.do(resetAllButton.click());
    cy.get('#list-permissions')
      .invoke('attr', 'aria-rowcount')
      .then((rowCount) => {
        expect(rowCount).to.equal(totalRows);
      });
  },

  permissionsCount() {
    cy.get('#list-permissions')
      .invoke('attr', 'aria-rowcount')
      .then((rowCount) => {
        totalRows = rowCount;
      });
  },
};
