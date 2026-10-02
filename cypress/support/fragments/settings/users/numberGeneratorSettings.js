import { including, Pane, Select, NavListItem } from '../../../../../interactors';

const rootPane = Pane('Number generator options');
const barcodeSelect = rootPane.find(Select({ id: 'barcode' }));
const numberGeneratorButton = NavListItem('Number generator options');

export const NUMBER_GENERATOR_OPTIONS = ['Off', 'On, field editable', 'On, field not editable'];

export default {
  selectFromSettings() {
    cy.expect(numberGeneratorButton.exists());
    cy.do(numberGeneratorButton.click());
  },

  waitLoading() {
    cy.expect(rootPane.exists());
  },

  checkBarcodeOptionsExist(options = NUMBER_GENERATOR_OPTIONS) {
    options.forEach((option) => {
      cy.expect(barcodeSelect.has({ optionsText: including(option) }));
    });
  },
};
