import { Button } from 'bigtest';
import { Checkbox, Section, Form } from '../../../../interactors';

export default {
  waitLoading() {
    cy.expect(Section({ id: 'title-level-requests-pane' }));
  },

  allowTitleLevelRequests() {
    cy.do([
      Checkbox('Allow title level requests').click(),
      Form({ id: 'title-level-requests-form' }).find(Button('Save')).click(),
    ]);
  },

  checkTitleRequestsAvailability() {
    cy.expect(Checkbox({ name:'titleLevelRequestsFeatureEnabled' }).has({ checked: true }));
  },
};
