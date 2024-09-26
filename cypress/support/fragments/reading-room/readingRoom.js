import { Button, KeyValue, Pane, PaneContent, TextField } from '../../../../interactors';

const rootSection = PaneContent({ id: 'reading-room-content' });

function fillInPatronCard(userBarcode) {
  cy.do(TextField({ id: 'patronBarcode' }).fillIn(userBarcode));
}

function clickEnterButton() {
  cy.do(Button({ type: 'submit' }).click());
}

export default {
  fillInPatronCard,
  clickEnterButton,
  waitLoading() {
    cy.expect(Pane({ id: 'reading-room' }).exists());
  },
  scanUser(userBarcode) {
    fillInPatronCard(userBarcode);
    cy.wait(1000);
    clickEnterButton();
  },
  clickNotAllowedButton() {
    cy.wait(1500);
    cy.do(Button({ id: 'deny-access' }).click());
  },

  verifyUserIsScanned(userfirstName) {
    cy.wait(5000);
    cy.get('[class^="borrowerDetails-"]').contains(userfirstName).should('be.visible');
  },
  verifyUserInformation(userInfo) {
    cy.expect([
      rootSection.find(KeyValue('First name')).has({ value: userInfo.firstName }),
      rootSection.find(KeyValue('Last name')).has({ value: userInfo.lastName }),
      rootSection.find(KeyValue('Patron group')).has({ value: userInfo.patronGroup }),
      rootSection.find(KeyValue('User type')).has({ value: userInfo.userType }),
      rootSection.find(KeyValue('Barcode')).has({ value: userInfo.barcode }),
      rootSection.find(KeyValue('User expiration')).has({ value: userInfo.expirationDate }),
    ]);
  },
  verifyWarningMessage(message) {
    cy.get('[class^="notAllowed-"]').contains(`Autotest_Room: ${message}`).should('be.visible');
  },
  verifyButtonsEnabled() {
    cy.do(Button({ id: 'allow-access' }).has({ disabled: true }));
    cy.expect([Button({ id: 'deny-access' }).exists(), Button({ id: 'cancel' }).exists()]);
  },

  verifyInformationAfterAction() {
    cy.expect(TextField({ id: 'patronBarcode' }).has({ value: '' }));
    cy.get('[class^="borrowerDetails-"]').should('not.exist');
  },
};
