import {
  HTML,
  including,
  Button,
  TextField,
  Selection,
  SelectionList,
} from '../../../../interactors';

export default {
  waitLoading: () => {
    cy.expect(HTML(including('New custom title')).exists());
  },

  fillInRequiredProperties: (packageName, titleName) => {
    cy.do(TextField('Name*').fillIn(titleName));
    cy.do(Selection('Package*').open());
    cy.do(SelectionList().filter(packageName));
    cy.do(SelectionList().select(packageName));
  },
  saveAndClose: () => {
    cy.do(Button('Save & close').click());
  },
};
