import { Pane, TextField, Button } from '../../../../interactors';

function fillInPatronCard(userBarcode) {
  cy.do(TextField({ id: 'patronBarcode' }).fillIn(userBarcode));
}

function clickenterButton() {
  cy.do(Button({ type: 'submit' }).click());
}

export default {
  fillInPatronCard,
  clickenterButton,
  waitLoading() {
    cy.expect(Pane({ id: 'reading-room' }).exists());
  },
  scanUser(userBarcode) {
    fillInPatronCard(userBarcode);
    clickenterButton();
  },
};
