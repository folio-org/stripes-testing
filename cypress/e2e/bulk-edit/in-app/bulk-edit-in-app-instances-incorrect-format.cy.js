import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import InteractorsTools from '../../../support/utils/interactorsTools';

let user;
const instanceUUIDsFileName = `instanceUUIDs-${getRandomPostfix()}.csv`;
const instanceHRIDFileName = `instanceHRIDFileName${getRandomPostfix()}.csv`;
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
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;
        FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, `,${uuid()}`);
        FileManager.createFile(`cypress/fixtures/${instanceHRIDFileName}`, `,${uuid()}`);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      [instanceUUIDsFileName, instanceHRIDFileName].forEach((fileName) => {
        FileManager.deleteFile(`cypress/fixtures/${fileName}`);
      });
      Users.deleteViaApi(user.userId);
    });

    it(
      'C440080 Verify Error while uploading file with incorrectly formatted identifiers - Instances (firebird)',
      { tags: ['criticalPath', 'firebird', 'C440080'] },
      () => {
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        cy.intercept('GET', '*bulk-operations/*').as('uuid');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        checkResponses('@uuid', numberOfRequests);
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(instanceUUIDsFileName));
        InteractorsTools.dismissCallout(getCalloutContent(instanceUUIDsFileName));

        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance HRIDs');
        cy.intercept('GET', '*bulk-operations/*').as('hrid');
        BulkEditSearchPane.uploadFile(instanceHRIDFileName);
        checkResponses('@hrid', numberOfRequests);
        InteractorsTools.checkCalloutErrorMessage(getCalloutContent(instanceHRIDFileName));
        InteractorsTools.dismissCallout(getCalloutContent(instanceHRIDFileName));
      },
    );
  });
});
