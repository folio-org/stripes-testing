import { Checkbox, Button, Modal, TextField, MultiColumnListRow, MultiColumnListCell } from '../../../../../interactors';

const ModalTransformation = Modal('Select transformations');

export default {
  searchItemTransformationsByName: (name) => {
    cy.get('div[class^=modal-] input[name=searchValue]').clear().type(`${name}{enter}`);
  },

  selectTransformations:(marcField, subfield) => {
    const cellInteractor = ModalTransformation
      .find(MultiColumnListRow())
      .find(MultiColumnListCell({ columnIndex: 2 }));

    cy.do(Checkbox({ ariaLabel: 'Select field' }).click());
    cy.then(() => cellInteractor.inputTextFieldNames())
      .then(inputFieldNames => {
        cy.do(cellInteractor.find(TextField({ name: inputFieldNames[0] })).fillIn(marcField));
        cy.do(cellInteractor.find(TextField({ name: inputFieldNames[3] })).fillIn(subfield));
        cy.do(ModalTransformation.find(Button('Save & close')).click());
      });
  },
};
