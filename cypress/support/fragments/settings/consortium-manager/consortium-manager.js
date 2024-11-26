import {
  Button,
  Modal,
  NavListItem,
  Section,
  SelectionOption,
  TextField,
  including,
  HTML,
  Dropdown,
  or,
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

  varifyConsortiumManagerOnPage() {
    cy.expect(
      Section({ id: 'settings-nav-pane' }).find(NavListItem('Consortium manager')).exists(),
    );
  },

  varifyConsortiumManagerIsAbsent() {
    cy.expect(
      Section({ id: 'settings-nav-pane' }).find(NavListItem('Consortium manager')).absent(),
    );
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

  switchActiveAffiliation(currentTenantName, newTenantName, servicePointName = null) {
    cy.wait(8000);
    cy.do([
      Dropdown({ id: 'profileDropdown' })
        .find(
          Button({
            ariaLabel: or(`${currentTenantName}  profile`, `${currentTenantName} Central profile`),
          }),
        )
        .click(),
      switchActiveAffiliationButton.click(),
      Modal('Select affiliation')
        .find(Button({ id: 'consortium-affiliations-select' }))
        .click(),
      SelectionOption(including(newTenantName)).click(),
    ]);
    cy.wait(1000);
    cy.do(Button({ id: 'save-active-affiliation' }).click());
    cy.wait(6000);
    cy.expect(
      Button({
        ariaLabel: or(`${newTenantName}  profile`, `${newTenantName} ${servicePointName} profile`),
      })
        .find(HTML({ text: including(newTenantName) }))
        .exists(),
    );
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
    cy.do(myProfileButton.click());
  },

  checkCurrentTenantInTopMenu(tenantName, servicePointName = null) {
    cy.expect(
      Dropdown({ id: 'profileDropdown' })
        .find(
          Button({
            ariaLabel: or(`${tenantName}  profile`, `${tenantName} ${servicePointName} profile`),
          }),
        )
        .exists(),
    );
  },

  editTenantName(oldName, newName) {
    cy.xpath(`//input[@value = '${oldName}']`).clear().type(newName);
  },

  saveEditingTenantChangesClickActiveButton() {
    cy.xpath("//button[contains(@id, 'save-consortia')]").should('not.be.disabled').click();
  },

  checkEditedTenantName(name) {
    cy.xpath(`//div[contains(text(), '${name}')]`).should('be.visible');
  },
};
