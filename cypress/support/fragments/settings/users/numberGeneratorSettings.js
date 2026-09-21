import { including, Pane, Select } from '../../../../../interactors';

const rootPane = Pane('Number generator options');
const barcodeSelect = rootPane.find(Select({ id: 'barcode' }));

export const NUMBER_GENERATOR_OPTIONS = ['Off', 'On, field editable', 'On, field not editable'];

export default {
  waitLoading() {
    cy.expect(rootPane.exists());
  },

  checkBarcodeOptionsExist(options = NUMBER_GENERATOR_OPTIONS) {
    options.forEach((option) => {
      cy.expect(barcodeSelect.has({ optionsText: including(option) }));
    });
  },
};
