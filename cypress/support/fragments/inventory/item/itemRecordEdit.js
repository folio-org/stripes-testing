import { including } from '@interactors/html';
import { Accordion, TextField, Pane, Button, TextArea } from '../../../../../interactors';

const cancelBtn = Button({ id: 'cancel-item-edit' });
const saveAndCloseBtn = Button({ id: 'clickable-save-item' });

export default {
  waitLoading: (itemTitle) => {
    cy.expect(Pane(including(itemTitle)).exists());
    cy.expect(cancelBtn.has({ disabled: false }));
    cy.expect(saveAndCloseBtn.has({ disabled: true }));
  },

  addBarcode: (barcode) => {
    cy.do(
      Accordion('Administrative data')
        .find(TextField({ name: 'barcode' }))
        .fillIn(barcode),
    );
    cy.expect(saveAndCloseBtn.has({ disabled: false }));
  },

  save: () => cy.do(saveAndCloseBtn.click()),

  addAdministrativeNote: (note) => {
    cy.do([
      Button('Add administrative note').click(),
      TextArea({ ariaLabel: 'Administrative note' }).fillIn(note),
    ]);
  },
};
