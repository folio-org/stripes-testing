import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InteractorsTools from '../../../support/utils/interactorsTools';

let user;
const externalId = getRandomPostfix();
const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const userExternalIDsFileName = `userExternalIDs_${getRandomPostfix()}.csv`;
const usernamesFileName = `userUsernames_${getRandomPostfix()}.csv`;
const errorMessage =
  'Incorrect number of tokens found in record: expected 1 actual 2 (IncorrectTokenCountException)';

const getCalloutContent = (fileName) => {
  return `${fileName} is formatted incorrectly. Please correct the formatting and upload the file again.`;
};
const numberOfRequests = 5;
const checkResponses = (alias, remainingRequests) => {
  if (remainingRequests > 0) {
    cy.wait(alias).then((interception) => {
      if (interception.response.body.errorMessage) {
        expect(interception.response.body.errorMessage).to.include(errorMessage);
      } else {
        checkResponses(alias, remainingRequests - 1);
      }
    });
  }
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([permissions.bulkEditUpdateRecords.gui, permissions.uiUserEdit.gui]).then(
        (userProperties) => {
          user = userProperties;
          FileManager.createFile(`cypress/fixtures/${userUUIDsFileName}`, `,${user.userId}`);
          FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, `,${user.barcode}`);
          FileManager.createFile(`cypress/fixtures/${userExternalIDsFileName}`, `,${externalId}`);
          FileManager.createFile(`cypress/fixtures/${usernamesFileName}`, `,${user.username}`);
          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });

          cy.getUsers({ limit: 1, query: `username=${user.username}` }).then((users) => {
            cy.updateUser({
              ...users[0],
              externalSystemId: externalId,
            });
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      [userUUIDsFileName, userBarcodesFileName, userExternalIDsFileName, usernamesFileName].forEach(
        (fileName) => {
          FileManager.deleteFile(`cypress/fixtures/${fileName}`);
        },
      );
      Users.deleteViaApi(user.userId);
    });

    it(
      'C440084 Verify Error while uploading file with incorrectly formatted identifiers - Users (firebird)',
      { tags: ['criticalPath', 'firebird', 'C440084'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User UUIDs');
        cy.intercept('GET', '*bulk-operations/*').as('uuid');
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        checkResponses('@uuid', numberOfRequests);
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(userUUIDsFileName));
        InteractorsTools.dismissCallout(getCalloutContent(userUUIDsFileName));

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'User Barcodes');
        cy.intercept('GET', '*bulk-operations/*').as('barcode');
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        checkResponses('@barcode', numberOfRequests);
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(userBarcodesFileName));
        InteractorsTools.dismissCallout(getCalloutContent(userBarcodesFileName));

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'External IDs');
        cy.intercept('GET', '*bulk-operations/*').as('id');
        BulkEditSearchPane.uploadFile(userExternalIDsFileName);
        checkResponses('@id', numberOfRequests);
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(userExternalIDsFileName));
        InteractorsTools.dismissCallout(getCalloutContent(userExternalIDsFileName));

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Users', 'Usernames');
        cy.intercept('GET', '*bulk-operations/*').as('username');
        BulkEditSearchPane.uploadFile(usernamesFileName);
        checkResponses('@username', numberOfRequests);
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(usernamesFileName));
        InteractorsTools.dismissCallout(getCalloutContent(usernamesFileName));
      },
    );
  });
});
