import {
  Button,
  Modal,
  NavListItem,
  Section,
  SelectionOption,
  TextField,
  including,
} from '../../../../../interactors';

export default {
  waitLoading() {
    cy.expect(Section({ id: 'app-settings-nav-pane' }).exists());
  },
  waitLoadingForAddresses() {
    cy.expect(Section({ id: 'app-settings-nav-pane' }).exists());
  },

  selectMembership() {
    cy.do(NavListItem('Membership').click());
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

  switchActiveAffiliation(tenantName) {
    cy.wait(8000);
    cy.do([
      Button({ ariaLabel: 'My profile' }).click(),
      Button('Switch active affiliation').click(),
      Modal('Select affiliation')
        .find(Button({ id: 'consortium-affiliations-select' }))
        .click(),
      SelectionOption(including(tenantName)).click(),
      Button({ id: 'save-active-affiliation' }).click(),
    ]);
    cy.wait(8000);
  },
};
