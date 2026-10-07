import {
  HTML,
  including,
  Callout,
  calloutTypes,
  Button,
  TextField,
  Selection,
  SelectionList,
} from '../../../../interactors';

const nameField = TextField({ name: 'name' });
const packageCreationCallout = 'Custom title created.';
const duplicateTitleNameError = 'Custom Title with the provided name already exists';

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

  fillInTitleName: (titleName) => {
    cy.do(TextField({ name: 'name' }).fillIn(titleName));
  },

  openPackageDropdown: () => {
    cy.do(Selection({ value: including('Choose a package') }).open());
  },

  verifyPackageDropdownExpanded: () => {
    cy.expect(SelectionList().exists());
  },

  selectPackage: (packageName) => {
    cy.do(SelectionList().filter(packageName));
    cy.do(SelectionList().select(packageName));
  },

  verifyPackageSelected: (packageName) => {
    cy.expect(Selection({ value: including(packageName) }).exists());
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

  close: () => {
    cy.do(Button({ icon: 'times' }).click());
  },

  checkCreationOfNewCustomTitle: () => {
    cy.expect(HTML(including(packageCreationCallout)).exists());
  },

  verifyDuplicateTitleNameCallout: (message = duplicateTitleNameError) => {
    const targetCallout = Callout(message, { type: calloutTypes.error });
    cy.expect(targetCallout.exists());
    cy.do(targetCallout.dismissToast());
    cy.expect(targetCallout.absent());
  },
};
