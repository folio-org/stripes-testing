import { Button, HTML, TextField, including, Select, Pane } from '../../../../interactors';

export default {
  waitLoading: () => {
    cy.expect(Pane().exists());
  },

  fillInRequiredProperties: (packageName) => {
    cy.do(TextField({ name: 'name' }).fillIn(packageName));
  },

  chooseContentType: (contentTypeValue) => {
    cy.do(Select({ name: 'contentType' }).choose(contentTypeValue));
  },

  saveAndClose: () => {
    cy.do(Button({ type: 'submit' }).click());
  },

  checkPackageCreatedCallout(calloutMessage = 'Custom package created.') {
    cy.expect(HTML(including(calloutMessage)).exists());
  },
};
