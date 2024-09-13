import { Button, KeyValue, Pane, PaneContent, TextField } from '../../../../interactors';

const rootSection = PaneContent({ id: 'reading-room-content' });

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

  verifyUserIsScanned(userfirstName) {
    cy.get('[class^="borrowerDetails-"]').contains(userfirstName).should('be.visible');
  },
  verifyUserInformation(userInfo) {
    cy.expect([
      rootSection.find(KeyValue('First name')).has({ value: userInfo.firstName }),
      rootSection.find(KeyValue('Last name')).has({ value: userInfo.lastName }),
      rootSection.find(KeyValue('Patron group')).has({ value: userInfo.patronGroup }),
      rootSection.find(KeyValue('User type')).has({ value: userInfo.userType }),
      rootSection.find(KeyValue('Barcode:')).has({ value: userInfo.barcode }),
      rootSection.find(KeyValue('User expiration:')).has({ value: userInfo.expirationDate }),
    ]);
  },
  verifyWarningMessage() {},
};
