import { HTML, including } from '@interactors/html';
import { Button, Modal, TextField } from '../../../../../interactors';

const newOrderModal = Modal({ id: 'create-order-from-instance-modal' });

const cancelButton = newOrderModal.find(Button('Cancel'));
const createButton = newOrderModal.find(Button('Create'));

const orderFields = {
  poNumber: newOrderModal.find(TextField({ name: 'poNumber' })),
};

const content =
  'Selecting an existing order before clicking "Create", will add a new order line to the selected order for this title. Leaving the order number field blank and clicking "Create" will allow you to create a new purchase order and purchase order line for this title.';

export default {
  waitLoading() {
    cy.expect(newOrderModal.exists());
  },
  verifyModalView() {
    cy.expect([
      newOrderModal.has({
        header: 'Create order',
      }),
      newOrderModal.has({
        message: including(content),
      }),
      cancelButton.has({ disabled: false, visible: true }),
      createButton.has({ disabled: false, visible: true }),
    ]);
  },
  isNotDisplayed() {
    cy.expect(newOrderModal.absent());
  },
  enterOrderNumber(orderNumber) {
    cy.do(orderFields.poNumber.fillIn(orderNumber));
  },
  verifyTextMessageExists(text) {
    cy.expect(orderFields.poNumber.has({ text: including(text) }));
  },
  clickCancel() {
    cy.expect(createButton.has({ disabled: false }));
    cy.do(cancelButton.click());
  },
  clickCreateButton() {
    cy.expect(createButton.has({ disabled: false }));
    cy.do(createButton.click());

    cy.wait(3000);
  },

  verifyTextDescriptionExists: (description) => {
    cy.expect(newOrderModal.find(HTML(including(description))).exists());
  },
};
