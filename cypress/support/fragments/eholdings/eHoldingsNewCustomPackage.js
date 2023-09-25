import { Button, HTML, TextField, including } from '../../../../interactors';

const calloutPackageCreatedText = 'Custom package created.';

export default {
  waitLoading: () => {
    cy.expect(HTML(including('New custom package')).exists());
  },

  fillInRequiredProperties: (packageName) => {
    cy.do(TextField('Name*').fillIn(packageName));
  },

  saveAndClose: () => {
    cy.do(Button('Save & close').click());
  },

  checkPackageCreatedCallout() {
    cy.expect(HTML(including(calloutPackageCreatedText)).exists());
  },
};
