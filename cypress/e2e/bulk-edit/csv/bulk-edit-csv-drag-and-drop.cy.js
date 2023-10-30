import uuid from 'uuid';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';

describe('bulk-edit', () => {
  describe('csv approach', () => {
    const testData = {};
    const userUUIDsFileName = `userUUIDs_${getRandomPostfix()}.csv`;
    const validUserUUID = uuid();

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.bulkEditCsvView.gui,
        Permissions.bulkEditCsvEdit.gui,
        Permissions.uiUsersView.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(
          `cypress/fixtures/${userUUIDsFileName}`,
          `${testData.user.userId}\r\n${validUserUUID}`,
        );
      });
    });

    after('Delete test data', () => {
      Users.deleteViaApi(testData.user.userId);
      FileManager.deleteFile(`cypress/fixtures/${userUUIDsFileName}`);
    });

    it(
      'C353540 Verify that the "Drag and Drop" is enabled after file is uploaded (firebird) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.firebird] },
      () => {
        BulkEditSearchPane.verifyDefaultFilterState();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);

        BulkEditSearchPane.selectRecordIdentifier('User UUIDs');
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyMatchedResults(testData.user.username);
        BulkEditSearchPane.verifyPaneRecordsCount(1);
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);

        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.matchedAccordionIsAbsent();
        BulkEditSearchPane.isDragAndDropAreaDisabled(false);
      },
    );

    it(
      'C353538 Verify link record identifier with the drag and drop area on the landing page (firebird) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.firebird] },
      () => {
        cy.visit(TopMenu.bulkEditPath);
        BulkEditSearchPane.verifyDefaultFilterState();
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
        BulkEditSearchPane.verifyDragNDropUsersUUIDsArea();
        BulkEditSearchPane.selectRecordIdentifier('Select record identifier');
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
        BulkEditSearchPane.verifyDragNDropExternalIDsArea();
        BulkEditSearchPane.selectRecordIdentifier('Select record identifier');
        BulkEditSearchPane.isDragAndDropAreaDisabled(true);
        BulkEditSearchPane.verifyDragNDropUsernamesArea();
        BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();
        BulkEditSearchPane.uploadFile(userUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
      },
    );
  });
});
