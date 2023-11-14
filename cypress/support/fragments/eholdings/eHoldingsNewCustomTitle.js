import {
  HTML,
  including,
  Button,
  TextField,
  Selection,
  SelectionList,
} from '../../../../interactors';

export default {
  waitLoading: (title = 'New custom title') => {
    cy.expect(HTML(including(title)).exists());
  },

  fillInRequiredProperties: (packageName, titleName) => {
    cy.do(TextField({ name: 'name' }).fillIn(titleName));
    cy.do(Selection({ name: 'packageId' }).open());
    cy.do(SelectionList().filter(packageName));
    cy.do(SelectionList().select(packageName));
  },
  saveAndClose: () => {
    cy.do(Button({ type: 'submit' }).click());
  },
};
