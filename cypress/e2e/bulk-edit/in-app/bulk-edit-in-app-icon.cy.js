import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import devTeams from '../../../support/dictionary/devTeams';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import UserEdit from '../../../support/fragments/users/userEdit';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import UsersCard from '../../../support/fragments/users/usersCard';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
let addressTypeId;
let addressType;
const todayDate = new Date();
const userBarcodesFileName = `userBarcodes_${getRandomPostfix()}.csv`;
const matchedRecordsFileName = `*Matched-Records-${userBarcodesFileName}`;
const previewOfProposedChangesFileName = `*-Updates-Preview-${userBarcodesFileName}`;
const updatedRecordsFileName = `*-Changed-Records*-${userBarcodesFileName}`;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.bulkEditEdit.gui,
          permissions.bulkEditUpdateRecords.gui,
          permissions.uiUserEdit.gui,
          permissions.bulkEditLogsView.gui,
          permissions.exportManagerAll.gui,
        ],
        'faculty',
      ).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        FileManager.createFile(`cypress/fixtures/${userBarcodesFileName}`, user.barcode);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      FileManager.deleteFile(`cypress/fixtures/${userBarcodesFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C396401 Verify reset state after clicking "Bulk edit" icon from the bulk edit In app form (firebird) (TaaS)',
      { tags: [testTypes.extendedPath, devTeams.firebird] },
      () => {
        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.barcode);
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        
        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();

        BulkEditSearchPane.checkUsersRadio();
        BulkEditSearchPane.selectRecordIdentifier('User Barcodes');
        BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();
        BulkEditSearchPane.uploadFile(userBarcodesFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(user.barcode);
        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.fillPatronGroup('faculty (Faculty Member)');
        BulkEditActions.confirmChanges();
        BulkEditActions.downloadPreview();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        
        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifyBulkEditImage();
        BulkEditSearchPane.verifyPanesBeforeImport();
        BulkEditSearchPane.verifyBulkEditPaneItems();
      }
    );
  });
});
