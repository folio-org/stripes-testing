import {
  HTML,
  including,
  Button,
  TextField,
  Selection,
  SelectionList,
} from '../../../../interactors';

const nameField = TextField({ name: 'name' });

export default {
  waitLoading: () => {
    cy.expect(HTML(including('New custom title')).exists());
  },

  createNewTitle: () => {
    cy.do(Button('New').click());
  },

  verifyNameFieldValue: (expectedValue) => {
    cy.expect(nameField.has({ value: expectedValue }));
  },

  fillInThePackageName: (packageName) => {
    cy.do(nameField.fillIn(packageName));
  },

  fillInRequiredProperties: (packageName, titleName) => {
    cy.do(TextField({ name: 'name' }).fillIn(titleName));
    cy.do(Selection({ value: including('Choose a package') }).open());
    cy.do(SelectionList().filter(packageName));
    cy.do(SelectionList().select(packageName));
  },
  fillInRequiredPropertiesWhenNotEnglishSession: (packageName, titleName) => {
    cy.do(TextField({ name: 'name' }).fillIn(titleName));
    cy.do(Selection({ name: 'packageId' }).open());
    cy.do(SelectionList().filter(packageName));
    cy.do(SelectionList().select(packageName));
  },
  saveAndClose: () => {
    cy.do(Button({ type: 'submit' }).click());
  },
};
