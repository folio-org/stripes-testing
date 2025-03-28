import uuid from 'uuid';
import { Button, KeyValue, Pane, PaneContent, TextField } from '../../../../interactors';

const rootSection = PaneContent({ id: 'reading-room-content' });
const patronBarcodeField = TextField({ id: 'patronBarcode' });
const notAllowedButton = Button({ id: 'deny-access' });
const allowedButton = Button({ id: 'allow-access' });
const cancelButton = Button({ id: 'cancel' });
const lastNameKeyValue = KeyValue('Last name');
const patronGroupKeyValue = KeyValue('Patron group');
const userTypeKeyValue = KeyValue('User type');
const barcodeKeyValue = KeyValue('Barcode');
const userExpirationKeyValue = KeyValue('User expiration');

function fillInPatronCard(userBarcode) {
  cy.do(patronBarcodeField.fillIn(userBarcode));
}

function clickEnterButton() {
  cy.do(rootSection.find(Button('Enter')).click());
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
    cy.do(notAllowedButton.click());
  },
  clickAllowedButton() {
    cy.get('#allow-access').click();
  },
  clickCancelButton() {
    cy.get('#cancel').click();
  },
  getReadingRoomViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'reading-room/access-log',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then((response) => {
        expect(response.status).equals(200);
        return response;
      });
  },

  verifyUserIsScanned(userfirstName) {
    cy.wait(5000);
    cy.get('[class^="borrowerDetails-"]').contains(userfirstName).should('be.visible');
  },
  verifyUserInformation(userInfo) {
    cy.expect([
      rootSection
        .find(KeyValue('Preferred first name'))
        .has({ value: userInfo.preferredFirstName }),
      rootSection.find(lastNameKeyValue).has({ value: userInfo.lastName }),
      rootSection.find(patronGroupKeyValue).has({ value: userInfo.patronGroup }),
      rootSection.find(userTypeKeyValue).has({ value: userInfo.userType }),
      rootSection.find(barcodeKeyValue).has({ value: userInfo.barcode }),
      rootSection.find(userExpirationKeyValue).has({ value: userInfo.expirationDate }),
    ]);
  },
  allowAccessForUser(readingRoomId, readingRoomName, servicePointId, userId) {
    return cy.okapiRequest({
      method: 'POST',
      path: `reading-room/${readingRoomId}/access-log`,
      body: {
        readingRoomId,
        readingRoomName,
        userId,
        patronId: userId,
        action: 'ALLOWED',
        servicePointId,
        id: uuid(),
      },
      isDefaultSearchParamsRequired: false,
    });
  },
  verifyWarningMessage(message) {
    cy.get('[class^="notAllowed-"]').contains(`Autotest_Room: ${message}`).should('be.visible');
  },
  verifyButtonsEnabled(allowed = true) {
    if (allowed) {
      cy.expect([allowedButton.exists(), notAllowedButton.exists(), cancelButton.exists()]);
    } else {
      cy.do(allowedButton.has({ disabled: true }));
      cy.expect([notAllowedButton.exists(), cancelButton.exists()]);
    }
  },
  verifyInformationAfterAction() {
    cy.expect(patronBarcodeField.has({ value: '' }));
    cy.get('[class^="borrowerDetails-"]').should('not.exist');
  },

  checkFieldsDisplayed() {
    cy.expect(patronBarcodeField.exists());
    cy.expect(rootSection.find(Button('Enter')).exists());
  },
};
