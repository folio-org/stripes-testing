import { Button, including, HTML, Selection } from '../../../../interactors';

// TODO: rewrite class to holdingsForm instead of holingsForm
const rootForm = HTML({ className: including('holingsForm-') });

export default {
  fillRequiredFields : () => {
    cy.do(Selection('Permanent*').choose('Annex (KU/CC/DI/A) Remote'));
  },
  saveAndClose : () => {
    cy.do(rootForm.find(Button('Save and close')).click());
    cy.expect(rootForm.absent());
  },
  waitLoading: () => {
    cy.expect(rootForm.exists());
  }
};
