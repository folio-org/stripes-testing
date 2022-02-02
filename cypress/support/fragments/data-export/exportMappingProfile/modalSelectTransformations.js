import { Checkbox, Button, Modal, TextField, MultiColumnListCell, MultiColumnListRow } from '../../../../../interactors';

const modalWindow = Modal('Select transformations');

export default {
  searchItemTransformationsByName: (name) => {
    cy.get('div[class^=modal-] input[name=searchValue]').type(`${name}{enter}`);
  },

  selectHoldingsTransformations:() => {
    const cellInteractor = modalWindow
      .find(MultiColumnListRow())
      .find(MultiColumnListCell({ columnIndex: 2 }));

    cy.do(Checkbox({ ariaLabel: 'Select field' }).click());
    cy.then(() => cellInteractor.inputTextFieldNames())
      .then(inputFieldNames => {
        cy.do(cellInteractor.find(TextField({ name: inputFieldNames[0] })).fillIn('901'));
        cy.do(cellInteractor.find(TextField({ name: inputFieldNames[3] })).fillIn('$a'));
        cy.do(modalWindow.find(Button('Save & close')).click());
      });
  },

  selectItemTransformations:() => {
    cy.do(Checkbox({ ariaLabel: 'Select field' }).click());
    cy.get('section[class^=pane-] input[placeholder="900"]').type('902');
    cy.get('section[class^=pane-] input[placeholder="$a"]').type('$a');
    cy.do(Modal('Select transformations').find(Button('Save & close')).click());
  },
};
