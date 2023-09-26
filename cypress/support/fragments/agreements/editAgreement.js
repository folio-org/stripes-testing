import { Pane, Section, Button } from '../../../../interactors';

const organizationSection = Section({ id: 'formOrganizations' });
const trashButton = Button({ icon: 'trash' });
const saveButton = Button('Save & close');

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
};
