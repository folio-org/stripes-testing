import { HTML, including } from '@interactors/html';
import {
  Button,
  Dropdown,
  Modal,
  NavListItem,
  Section,
  SelectionOption,
  TextField,
} from '../../../../../interactors';

const myProfileButton = Dropdown({ id: 'profileDropdown' }).find(Button());
const switchActiveAffiliationButton = Button('Switch active affiliation');

export default {
  waitLoading() {
    cy.expect(Section({ id: 'app-settings-nav-pane' }).exists());
  },
  waitLoadingForAddresses() {
    cy.expect(Section({ id: 'app-settings-nav-pane' }).exists());
  },

  verifyConsortiumManagerOnPage() {
    cy.expect(
      Section({ id: 'settings-nav-pane' }).find(NavListItem('Consortium manager')).exists(),
    );
  },

  verifyConsortiumManagerIsAbsent() {
    cy.expect(
      Section({ id: 'settings-nav-pane' }).find(NavListItem('Consortium manager')).absent(),
    );
  },

  selectMembership() {
    cy.do(NavListItem('Membership').click());
  },

  getIndexForTenantRow(tenantName) {
    return cy
      .get('div[class*=mclCell-]')
      .contains(tenantName)
      .then((element) => {
        const rowNumberAttr = element[0]
          .closest('div[data-row-index]')
          .getAttribute('data-row-index');
        const rowNumber = rowNumberAttr ? rowNumberAttr.split('-').pop() : null;

        return cy.wrap(rowNumber);
      });
  },

  editTenant(name) {
    cy.contains('div[class*="mclCell-"]', name)
      .parent('div[class*="mclRow-"]')
      .find('button[icon="edit"]')
      .click();
  },

  editTenantInformation(tenantIndex, codeText, nameText) {
    cy.do([
      TextField({ name: `items[${tenantIndex}].code` }).fillIn(codeText),
      TextField({ name: `items[${tenantIndex}].name` }).fillIn(nameText),
    ]);
  },

  saveEditingTenantInformation(tenantIndex) {
    cy.do(Button({ id: `clickable-save-consortia-membership-${tenantIndex}` }).click());
  },

  cancelEditingTenantInformation(tenantIndex) {
    cy.do(Button({ id: `clickable-cancel-consortia-membership-${tenantIndex}` }).click());
  },

  checkEditedTenantInformation(tenantIndex, codeText, nameText) {
    cy.expect([
      TextField({ name: `items[${tenantIndex}].code` }).has({ value: codeText }),
      TextField({ name: `items[${tenantIndex}].name` }).has({ value: nameText }),
    ]);
  },

  checkErrorsInEditedTenantInformation(tenantIndex, codeText, nameText) {
    cy.expect([
      TextField({ name: `items[${tenantIndex}].code` }).has({ error: codeText }),
      TextField({ name: `items[${tenantIndex}].name` }).has({ error: nameText }),
    ]);
  },

  switchActiveAffiliation(currentTenantName, newTenantName, servicePointName = null) {
    cy.wait(8000);
    cy.expect(myProfileButton.find(HTML(currentTenantName)).exists());
    cy.do([
      myProfileButton.click(),
      switchActiveAffiliationButton.click(),
      Modal('Select affiliation')
        .find(Button({ id: 'consortium-affiliations-select' }))
        .click(),
      SelectionOption(including(newTenantName)).click(),
      Button({ id: 'save-active-affiliation' }).click(),
    ]);
    cy.wait(8000);
    cy.expect(myProfileButton.find(HTML(newTenantName)).exists());
    if (servicePointName) {
      cy.expect(myProfileButton.find(HTML(servicePointName)).exists());
    }
  },

  switchActiveAffiliationIsAbsent() {
    cy.wait(8000);
    cy.do(myProfileButton.click());
    cy.expect(switchActiveAffiliationButton.absent());
    cy.do(myProfileButton.click());
  },

  switchActiveAffiliationExists() {
    cy.wait(8000);
    cy.do(myProfileButton.click());
    cy.expect(switchActiveAffiliationButton.exists());
    cy.wait(1000);
    cy.do(myProfileButton.click());
    cy.wait(1000);
  },

  checkCurrentTenantInTopMenu(tenantName, servicePointName = null) {
    cy.expect(myProfileButton.find(HTML(tenantName)).exists());
    if (servicePointName) {
      cy.expect(myProfileButton.find(HTML(servicePointName)).exists());
    }
  },
};
