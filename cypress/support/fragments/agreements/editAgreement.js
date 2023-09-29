import { including } from '@interactors/html';
import { Pane, Section, Button, Card, Select } from '../../../../interactors';

const organizationSection = Section({ id: 'formOrganizations' });
const trashButton = Button({ icon: 'trash' });
const saveButton = Button('Save & close');
const internalContactsSection = Section({ id: 'formInternalContacts' });
const linkUserButton = Button('Link user');
const addInternalContactButton = Button({ id: 'add-contacts-btn' });

export default {
  waitLoading: () => {
    cy.expect(Pane({ id: 'pane-agreement-form' }).exists());
  },

  removeOrganization() {
    cy.do(organizationSection.find(trashButton).click());
  },

  saveAndClose() {
    cy.do(saveButton.click());
  },

  clickAddInternalContact() {
    cy.do(addInternalContactButton.click());
  },

  clickLinkUser() {
    cy.do(linkUserButton.click());
  },

  verifyInternalContactIsShown(userName) {
    cy.expect(internalContactsSection.find(Card(including(userName))).exists());
  },

  setRoleByName(userName, roleName) {
    cy.do(
      internalContactsSection
        .find(Card(including(`user ${userName}`)))
        .find(Select())
        .choose(roleName),
    );
  },
};
