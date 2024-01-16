import { Button, Modal, Select, TextField } from '../../../../../interactors';

const titlesFilterModal = Modal({
  id: 'eholdings-details-view-search-modal',
});
const searchFieldSelect = titlesFilterModal.find(Select({ dataTestID: 'field-to-search-select' }));
const searchInputField = titlesFilterModal.find(TextField({ id: 'eholdings-search' }));
const resetAllButton = titlesFilterModal.find(Button('Reset all'));
const searchButton = titlesFilterModal.find(Button('Search'));

export default {
  verifyModalView() {
    cy.expect([
      titlesFilterModal.has({
        header: 'Filter titles',
      }),
      searchFieldSelect.has({ value: 'title' }),
      searchInputField.has({ value: '' }),
      resetAllButton.has({ disabled: false, visible: true }),
      searchButton.has({ disabled: true, visible: true }),
    ]);
  },
  typeSearchQuery(query) {
    cy.do(searchInputField.fillIn(query));
    cy.expect(searchInputField.has({ value: query }));

    // wait search filter to be applied
    cy.wait(1000);
  },
  clickResetAllButton() {
    cy.do(resetAllButton.click());
    cy.expect(titlesFilterModal.absent());
  },
  clickSearchButton() {
    cy.do(searchButton.click());
    cy.expect(titlesFilterModal.absent());

    // wait search filter to be applied
    cy.wait(2000);
  },
};
