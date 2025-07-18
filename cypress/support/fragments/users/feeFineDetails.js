import { Button, HTML, KeyValue, Pane, including } from '../../../../interactors';

const rootPane = Pane({ id: 'pane-account-action-history' });

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
};
