import { Pane, including, HTML, Button } from '../../../../interactors';

const rootPane = Pane({ id: 'pane-account-action-history' });

export default {
  waitLoading:() => {
    cy.expect(rootPane.exists());
    cy.expect(HTML(including('Fee/fine details')).exists());
  },
  openPayModal: () => cy.do(rootPane.find(Button({ id:'payAccountActionsHistory' })).click()),
  openNewStaffInfo: () => cy.do(HTML({ text: 'New staff info', id: 'button' }).click()),
  checkNewStaffInfo: (info) => cy.expect(HTML(info).exists()),
};
