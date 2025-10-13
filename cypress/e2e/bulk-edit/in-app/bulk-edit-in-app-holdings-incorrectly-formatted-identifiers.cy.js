import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane, {
  ERROR_MESSAGES,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
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
const errorMessage = ERROR_MESSAGES.INCORRECT_TOKEN_NUMBER;
const getCalloutContent = (fileName) => {
  return `${fileName} is formatted incorrectly. Please correct the formatting and upload the file again.`;
};
const checkResponse = (alias, fileName, maxRetries = 20) => {
  let retries = 0;
  const waitForFailedStatus = () => {
    cy.wait(alias).then((interception) => {
      retries++;
      if (retries > maxRetries) {
        throw new Error('Exceeded maximum retry attempts waiting for status to equal FAILED');
      }
      if (interception.response.body.status === 'FAILED') {
        expect(interception.response.body.linkToTriggeringCsvFile).to.include(fileName);
        expect(interception.response.body.errorMessage).to.include(errorMessage);
      } else {
        waitForFailedStatus();
      }
    });
  };
  waitForFailedStatus();
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
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
      { tags: ['criticalPath', 'firebird', 'C440082'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
        cy.intercept('GET', '/bulk-operations/*').as('bulkOperationHoldingsUUIDs');
        BulkEditSearchPane.uploadFile(fileNameInvalidHoldingsUUIDs);
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(fileNameInvalidHoldingsUUIDs));
        checkResponse('@bulkOperationHoldingsUUIDs', fileNameInvalidHoldingsUUIDs);
        InteractorsTools.dismissCallout(getCalloutContent(fileNameInvalidHoldingsUUIDs));

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings HRIDs');
        cy.intercept('GET', '/bulk-operations/*').as('bulkOperationHoldingsHRIDs');
        BulkEditSearchPane.uploadFile(fileNameInvalidHoldingsHRIDs);
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(fileNameInvalidHoldingsHRIDs));
        checkResponse('@bulkOperationHoldingsHRIDs', fileNameInvalidHoldingsHRIDs);
        InteractorsTools.dismissCallout(getCalloutContent(fileNameInvalidHoldingsHRIDs));

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Instance HRIDs');
        cy.intercept('GET', '/bulk-operations/*').as('bulkOperationInstanceHRIDs');
        BulkEditSearchPane.uploadFile(fileNameInvalidInstanceHRIDs);
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(fileNameInvalidInstanceHRIDs));
        checkResponse('@bulkOperationInstanceHRIDs', fileNameInvalidInstanceHRIDs);
        InteractorsTools.dismissCallout(getCalloutContent(fileNameInvalidInstanceHRIDs));

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Item barcodes');
        cy.intercept('GET', '/bulk-operations/*').as('bulkOperationItemBarcodes');
        BulkEditSearchPane.uploadFile(fileNameInvalidItemBarcodes);
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(fileNameInvalidItemBarcodes));
        checkResponse('@bulkOperationItemBarcodes', fileNameInvalidItemBarcodes);
        InteractorsTools.dismissCallout(getCalloutContent(fileNameInvalidItemBarcodes));
      },
    );
  });
});
