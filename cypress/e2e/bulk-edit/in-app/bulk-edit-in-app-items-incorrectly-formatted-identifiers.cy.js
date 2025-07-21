import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

let user;
const testFileName = `invalidIdentifier_${getRandomPostfix()}.csv`;
const errorMessage =
  'Incorrect number of tokens found in record: expected 1 actual 3 (IncorrectTokenCountException)';
const getCalloutContent = (fileName) => {
  return `${fileName} is formatted incorrectly. Please correct the formatting and upload the file again.`;
};
const identifierTypes = [
  'Item barcodes',
  'Item UUIDs',
  'Item HRIDs',
  'Item former identifiers',
  'Item accession numbers',
  'Holdings UUIDs',
];
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
    before('create test user', () => {
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditDeleteItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        FileManager.createFile(
          `cypress/fixtures/${testFileName}`,
          `${randomFourDigitNumber()},${randomFourDigitNumber()},${randomFourDigitNumber()}`,
        );

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${testFileName}`);
    });

    it(
      'C440083 Verify Error while uploading file with incorrectly formatted identifiers - Items (firebird)',
      { tags: ['criticalPath', 'firebird', 'C440083'] },
      () => {
        identifierTypes.forEach((label) => {
          BulkEditSearchPane.checkItemsRadio();
          BulkEditSearchPane.selectRecordIdentifier(label);
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', label);
          cy.intercept('GET', '/bulk-operations/*').as('bulkOperation');
          BulkEditSearchPane.uploadFile(testFileName);
          InteractorsTools.checkCalloutErrorMessage(getCalloutContent(testFileName));
          checkResponse('@bulkOperation', testFileName);
          InteractorsTools.dismissCallout(getCalloutContent(testFileName));
        });
      },
    );
  });
});
