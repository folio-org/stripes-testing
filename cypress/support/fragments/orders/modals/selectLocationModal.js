import { Button, Modal, MultiColumnListCell, TextField } from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';

const selectLocationModal = Modal('Select locations');

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(selectLocationModal.exists());
  },
  verifyModalView() {
    cy.expect(selectLocationModal.exists());
  },
  selectLocation(institutionId) {
    cy.do([
      selectLocationModal.find(TextField({ id: 'input-record-search' })).fillIn(institutionId),
      selectLocationModal.find(Button('Search')).click(),
      selectLocationModal
        .find(MultiColumnListCell({ content: institutionId, row: 0, columnIndex: 0 }))
        .click(),
    ]);
  },
};
