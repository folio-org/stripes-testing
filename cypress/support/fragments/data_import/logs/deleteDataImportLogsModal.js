import { Button, Modal, HTML, including } from '../../../../../interactors';

const confirmModal = Modal('Delete data import logs?');

export default {
  confirmDelete:(quantity) => {
    cy.expect(confirmModal
      .find(HTML(including('Data import logs selected')))
      .exists());
    cy.expect(confirmModal
      .find(HTML(including(`${quantity}`)))
      .exists());
    cy.expect(confirmModal
      .find(HTML(including('Are you sure that you want to delete these data import logs? Deleted logs will be permanently removed and cannot be retrieved.')))
      .exists());
    cy.do(confirmModal.find(Button('Yes, delete')).click());
  },
};
