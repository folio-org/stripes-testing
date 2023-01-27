import { Pane, including, HTML, Button, TextArea } from '../../../../interactors';

const rootPane = Pane({ id: 'pane-account-action-history' });

export default {
  waitLoading: () => {
    cy.expect(rootPane.exists());
    cy.expect(HTML(including('Fee/fine details')).exists());
  },
  openPayModal: () => {
    cy.do(rootPane.find(Button('Actions')).click());
    cy.do(Button('Pay').click());
  },
  openErrorModal: () => cy.do(Button('Error').click()),
  openNewStaffInfo: () => cy.do(HTML({ text: 'New staff info', id: 'button' }).click()),
  checkNewStaffInfo: (info) => cy.expect(HTML(info).exists()),
  openActions: () => cy.do(Button('Actions').click()),
  confirmFeeFineCancellation: (comment) => {
    cy.do([
      TextArea({ name: 'comment' }).fillIn(comment),
      Button({ type: 'submit' }).click(),
    ]);
  },
};
