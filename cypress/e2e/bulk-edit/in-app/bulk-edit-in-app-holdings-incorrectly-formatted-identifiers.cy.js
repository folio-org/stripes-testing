import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import InteractorsTools from '../../../support/utils/interactorsTools';

let user;
const fileNameInvalidHoldingsUUIDs = `invalidHoldingsUUIDs ${getRandomPostfix()}.csv`;
const fileNameInvalidHoldingsHRIDs = `invalidHoldingsHRIDs ${getRandomPostfix()}.csv`;
const fileNameInvalidInstanceHRIDs = `invalidInstanceHRIDs ${getRandomPostfix()}.csv`;
const fileNameInvalidItemBarcodes = `invalidItemBarcodes ${getRandomPostfix()}.csv`;
const arrayOfFileNames = [
  fileNameInvalidHoldingsUUIDs,
  fileNameInvalidHoldingsHRIDs,
  fileNameInvalidInstanceHRIDs,
  fileNameInvalidItemBarcodes,
];
const errorMessage =
  'Incorrect number of tokens found in record: expected 1 actual 3 (IncorrectTokenCountException)';
const getCalloutContent = (fileName) => {
  return `${fileName} is formatted incorrectly. Please correct the formatting and upload the file again.`;
};
const numberOfRequests = 10;
const checkResponse = (alias, fileName, remainingRequests) => {
  if (remainingRequests > 0) {
    cy.log('Remaining requests', remainingRequests);
    console.log('Remaining requests', remainingRequests);

    cy.wait(alias).then((interception) => {
      cy.log('interception', interception);
      console.log('interception', interception);

      if (interception.response.body.errorMessage) {
        expect(interception.response.body.errorMessage).to.eq(errorMessage);
        expect(interception.response.body.linkToTriggeringCsvFile).to.include(fileName);
      } else {
        checkResponse(alias, remainingRequests - 1);
      }
    });
  }
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditEdit.gui, permissions.inventoryCRUDHoldings.gui]).then(
        (userProperties) => {
          user = userProperties;

          arrayOfFileNames.forEach((fileName) => {
            FileManager.createFile(
              `cypress/fixtures/${fileName}`,
              `${randomFourDigitNumber()},${randomFourDigitNumber()},${randomFourDigitNumber()}`,
            );
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);

      arrayOfFileNames.forEach((fileName) => {
        FileManager.deleteFile(`cypress/fixtures/${fileName}`);
      });
    });

    it(
      'C440082 Verify Error while uploading file with incorrectly formatted identifiers - Holdings (firebird)',
      { tags: ['criticalPath', 'firebird'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        cy.intercept('GET', '*bulk-operations/*').as('bulkOperationHoldingsUUIDs');
        BulkEditSearchPane.uploadFile(fileNameInvalidHoldingsUUIDs);
        checkResponse(
          '@bulkOperationHoldingsUUIDs',
          fileNameInvalidHoldingsUUIDs,
          numberOfRequests,
        );
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(fileNameInvalidHoldingsUUIDs));
        InteractorsTools.dismissCallout(getCalloutContent(fileNameInvalidHoldingsUUIDs));

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings HRIDs');
        cy.intercept('GET', '*bulk-operations/*').as('bulkOperationHoldingsHRIDs');
        BulkEditSearchPane.uploadFile(fileNameInvalidHoldingsHRIDs);
        checkResponse(
          '@bulkOperationHoldingsHRIDs',
          fileNameInvalidHoldingsHRIDs,
          numberOfRequests,
        );
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(fileNameInvalidHoldingsHRIDs));
        InteractorsTools.dismissCallout(getCalloutContent(fileNameInvalidHoldingsHRIDs));

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Instance HRIDs');
        cy.intercept('GET', '*bulk-operations/*').as('bulkOperationInstanceHRIDs');
        BulkEditSearchPane.uploadFile(fileNameInvalidInstanceHRIDs);
        checkResponse(
          '@bulkOperationInstanceHRIDs',
          fileNameInvalidInstanceHRIDs,
          numberOfRequests,
        );
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(fileNameInvalidInstanceHRIDs));
        InteractorsTools.dismissCallout(getCalloutContent(fileNameInvalidInstanceHRIDs));

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Item barcodes');
        cy.intercept('GET', '*bulk-operations/*').as('bulkOperationItemBarcodes');
        BulkEditSearchPane.uploadFile(fileNameInvalidItemBarcodes);
        checkResponse('@bulkOperationItemBarcodes', fileNameInvalidItemBarcodes, numberOfRequests);
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(fileNameInvalidItemBarcodes));
        InteractorsTools.dismissCallout(getCalloutContent(fileNameInvalidItemBarcodes));
      },
    );
  });
});
