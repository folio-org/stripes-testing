import { including } from '@interactors/html';
import { Accordion, TextField, Pane, Button } from '../../../../../interactors';

const saveAndCloseBtn = Button('Save & close');
const cancelBtn = Button('Cancel');

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
