import { including } from '@interactors/html';
import { Accordion, TextField, Pane, Button, TextArea, Select } from '../../../../../interactors';

const saveAndCloseBtn = Button('Save & close');
const cancelBtn = Button('Cancel');
const callNumberTextField = TextArea('Call number');
const callNumberType = Select('Call number type');

export default {
  waitLoading: (itemTitle) => {
    cy.expect(Pane(including(itemTitle)).exists());
    cy.expect(cancelBtn.has({ disabled: false }));
  },

  addBarcode: (barcode) => {
    cy.do(
      Accordion('Administrative data')
        .find(TextField({ name: 'barcode' }))
        .fillIn(barcode),
    );
    cy.expect(saveAndCloseBtn.has({ disabled: false }));
  },
  addCallNumber: (callNumber) => {
    cy.do(callNumberTextField.fillIn(callNumber));
  },
  chooseCallNumberType: (type) => {
    cy.do(callNumberType.choose(type));
  },

  save: () => cy.do(saveAndCloseBtn.click()),

  createViaApi: (holdingsId, itemBarcode, materialTypeId, permanentLoanTypeId) => {
    cy.okapiRequest({
      method: 'POST',
      path: 'inventory/items',
      body: {
        status: { name: 'Available' },
        holdingsRecordId: holdingsId,
        boundWithTitles: [],
        barcode: itemBarcode,
        materialType: { id: materialTypeId },
        permanentLoanType: { id: permanentLoanTypeId },
      },
      isDefaultSearchParamsRequired: false,
    });
  },
};
