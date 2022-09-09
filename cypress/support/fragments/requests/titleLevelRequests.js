import { Button } from 'bigtest';
import { Checkbox, Section, Form, Heading } from '../../../../interactors';

export default {
  waitLoading() {
    cy.expect(Section({ id: 'title-level-requests-pane' }));
  },

  clickTitleLevelRequestsCheckbox() {
    cy.do([
      Checkbox('Allow title level requests').click(),
      Checkbox({ name : 'createTitleLevelRequestsByDefault' }).click(),
    ]);
    cy.do(Form({ id: 'title-level-requests-form' }).find(Button('Save')).click());
  },

  checkTitleRequestsDisaabled() {
    cy.expect(Checkbox({ name:'titleLevelRequestsFeatureEnabled' }).has({ checked: false }));
  },

  checkTitleRequestsEnabled() {
    cy.expect(Checkbox({ name:'titleLevelRequestsFeatureEnabled' }).has({ checked: true }));
  },
};
