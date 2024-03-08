import { Button, Modal, MultiColumnListCell, TextField } from '../../../../../interactors';

const selectLocationModal = Modal('Select locations');

export default {
  waitLoading() {
    cy.expect(selectLocationModal.exists());
  },
  verifyModalView() {
    cy.expect(selectLocationModal.exists());
  },
  selectLocation(institutionId) {
    cy.do([
      selectLocationModal.find(TextField({ id: 'input-record-search' })).fillIn(institutionId),
      selectLocationModal.find(Button('Search')).click(),
      selectLocationModal.find(MultiColumnListCell(institutionId)).click(),
    ]);
  },
};
