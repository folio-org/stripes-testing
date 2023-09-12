import { Button, HTML, Modal, including, Select, TextField } from '../../../../interactors';

const rootModal = Modal({ id: 'waive-modal' });
const confirmModal = Modal({ title: 'Confirm fee/fine waive' });
const amountField = TextField({ name: 'amount' });
const submitButton = Button({ id: 'submit-button' });

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },
  confirmModalLoaded: () => cy.expect(confirmModal.exists()),
  isClosed: () => cy.expect(rootModal.absent()),
  checkWaiveMessage: (feeFinesNumber, totalAmount) => {
    if (feeFinesNumber > 1) {
      cy.expect(
        rootModal
          .find(
            HTML(
              including(
                `Waiving ${feeFinesNumber} fees/fines for a total amount of ${totalAmount}`,
              ),
            ),
          )
          .exists(),
      );
    } else {
      cy.expect(
        rootModal
          .find(
            HTML(
              including(`Waiving ${feeFinesNumber} fee/fine for a total amount of ${totalAmount}`),
            ),
          )
          .exists(),
      );
    }
  },
  checkPartialWaiveMessage: (feeFinesNumber, totalAmount) => {
    cy.expect(
      rootModal
        .find(
          HTML(
            including(
              `Partially waive ${feeFinesNumber} fee/fine for a total amount of ${totalAmount}`,
            ),
          ),
        )
        .exists(),
    );
  },
  selectWaiveReason: (waiveReason) => cy.do(Select({ name: 'method' }).choose(waiveReason)),
  setWaiveAmount: (amount) => {
    cy.do(amountField.fillIn(amount));
  },
  waiveAmountHasError: (errorMessage) => {
    cy.expect(amountField.has({ error: errorMessage }));
  },
  isConfirmDisabled: (isDisabled) => cy.expect(submitButton.is({ disabled: isDisabled })),
  submitWaive: () => cy.do(submitButton.click()),
  confirm: () => {
    cy.do(submitButton.click());
    cy.do(Button('Confirm').click());
  },
  cancel: () => cy.do(Button({ id: 'cancel-button' }).click()),
  waiveFeeFineViaApi: (apiBody, feeFineId) => cy.okapiRequest({
    method: 'POST',
    path: `accounts/${feeFineId}/waive`,
    body: apiBody,
    isDefaultSearchParamsRequired: false,
  }),
};
