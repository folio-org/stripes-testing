import { Button, HTML, KeyValue, Pane, including, TextArea, Modal } from '../../../../interactors';

const rootPane = Pane({ id: 'pane-account-action-history' });
const errorModal = Modal({ id: 'error-modal' });

export default {
  waitLoading: () => {
    cy.expect(rootPane.exists());
    cy.expect(HTML(including('Fee/fine details')).exists());
  },
  openPayModal() {
    cy.do(Button('Pay').click());
    cy.wait(500);
  },
  openWaiveModal: () => {
    cy.do(Button('Waive').click());
    cy.wait(500);
  },
  openRefundModal: () => {
    cy.do(Button('Refund').click());
    cy.wait(500);
  },
  openTransferModal: () => {
    cy.do(Button('Transfer').click());
    cy.wait(500);
  },
  openErrorModal: () => {
    cy.do(Button('Error').click());
    cy.wait(500);
  },
  openNewStaffInfo: () => cy.do(HTML({ text: 'New staff info', id: 'button' }).click()),
  checkNewStaffInfo: (info) => cy.expect(HTML('STAFF : ' + info).exists()),
  openActions: () => {
    cy.wait(500);
    cy.xpath('.//button[.="Actions"]').click();
    cy.wait(500);
  },
  confirmFeeFineCancellation: (comment) => {
    cy.get('textarea[name="comment"]').type(comment);
    cy.do(Button({ type: 'submit' }).click());
    cy.wait(1000);
  },
  verifyBilledDateValue: (expectedBilledDateValue) => {
    cy.expect(KeyValue('Billed date').has({ value: expectedBilledDateValue }));
  },
  checkFeeFineBilledAmount(amount) {
    cy.expect([
      Pane(including('Fee/fine details')).exists(),
      KeyValue('Billed amount').has({ value: amount }),
    ]);
  },
  checkFeeFineLatestPaymentStatus(status) {
    cy.expect([
      Pane(including('Fee/fine details')).exists(),
      KeyValue('Latest payment status').has({ value: status }),
    ]);
  },
  checkFeeFineRemainingAmount(amount) {
    cy.expect([
      Pane(including('Fee/fine details')).exists(),
      KeyValue('Remaining amount').has({ value: amount }),
    ]);
  },
  verifyActionsAreAvailable: (actions) => {
    actions.forEach((action) => {
      if (action === 'Export') {
        cy.expect(
          Button({
            id: `${action.toLowerCase()}AccountActionsHistoryReport`,
            disabled: false,
          }).exists(),
        );
      } else {
        cy.expect(
          Button({ id: `${action.toLowerCase()}AccountActionsHistory`, disabled: false }).exists(),
        );
      }
    });
  },
  verifyWaiveReasonInHistory: (reasonName) => {
    cy.expect(HTML(including(reasonName)).exists());
  },
  verifyNoCommentInHistory: () => {
    cy.expect(HTML(including('Additional information for staff')).absent());
  },
  checkComment: (comment) => {
    cy.expect(HTML(including(comment)).exists());
  },
  cancelAsError: (comment) => {
    cy.do(Button('Actions').click());
    cy.wait(500);
    cy.do(Button('Error').click());
    cy.wait(500);
    cy.do(errorModal.find(TextArea({ name: 'comment' })).fillIn(''));
    cy.expect(errorModal.find(HTML(including('Comment must be provided'))).exists());
    cy.do([
      errorModal.find(TextArea({ name: 'comment' })).fillIn(comment),
      Button({ type: 'submit' }).click(),
    ]);
    cy.wait(1000);
  },
  closeDetails: () => {
    cy.do(Button({ icon: 'times' }).click());
    cy.wait(500);
  },
  verifyRefundButtonState: (isEnabled) => {
    if (isEnabled) {
      cy.expect(Button({ id: 'refundAccountActionsHistory', disabled: false }).exists());
    } else {
      cy.get('button[id="refundAccountActionsHistory"]').should(($btn) => {
        if ($btn.length > 0) {
          expect($btn).to.have.attr('disabled');
        }
      });
    }
  },
  verifyRefundModalMessage: () => {
    cy.expect(HTML(including('Refunding 1 fee/fine for a total amount of')).exists());
  },
  verifyErrorButtonDisabled: () => {
    cy.get('button[id="errorAccountActionsHistory"]').should(($btn) => {
      if ($btn.length > 0) {
        expect($btn).to.have.attr('disabled');
      }
    });
  },
};
