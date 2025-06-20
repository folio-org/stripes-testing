import { Button, HTML, KeyValue, Pane, TextArea, including } from '../../../../interactors';

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
  openWaiveModal: () => cy.do(Button('Waive').click()),
  openRefundModal: () => cy.do(Button('Refund').click()),
  openTransferModal: () => cy.do(Button('Transfer').click()),
  openErrorModal: () => cy.do(Button('Error').click()),
  openNewStaffInfo: () => cy.do(HTML({ text: 'New staff info', id: 'button' }).click()),
  checkNewStaffInfo: (info) => cy.expect(HTML('STAFF : ' + info).exists()),
  openActions: () => {
    cy.wait(500);
    cy.xpath('.//button[.="Actions"]').click();
    cy.wait(500);
  },
  confirmFeeFineCancellation: (comment) => {
    cy.do([TextArea({ name: 'comment' }).fillIn(comment), Button({ type: 'submit' }).click()]);
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
