import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

let user;
const invalidInstanceUUID = `invalidInstanceUUID-${uuid()}`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};
const instanceUUIDsFileName = `validInstanceUUIDs_${getRandomPostfix()}.csv`;
const invalidInstanceUUIDsFileName = `invalidInstanceUUIDs_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        Permissions.bulkEditView.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        FileManager.createFile(
          `cypress/fixtures/${invalidInstanceUUIDsFileName}`,
          invalidInstanceUUID,
        );
        FileManager.createFile(`cypress/fixtures/${instanceUUIDsFileName}`, item.instanceId);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUUIDsFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${invalidInstanceUUIDsFileName}`);
    });

    it(
      'C423687 Verify "Search column name" search box for Instances records (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C423687'] },
      () => {
        cy.viewport(1000, 660);
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(instanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditSearchPane.verifyCheckedCheckboxesPresentInTheTable();
        BulkEditSearchPane.verifyActionsDropdownScrollable();
        BulkEditSearchPane.searchColumnName('note');
        const columnNameNote = 'Administrative note';
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(columnNameNote);
        BulkEditSearchPane.verifyResultColumnTitles(columnNameNote);
        BulkEditSearchPane.clearSearchColumnNameTextfield();

        BulkEditSearchPane.searchColumnName('fewoh', false);
        BulkEditSearchPane.clearSearchColumnNameTextfield();
        BulkEditSearchPane.searchColumnName('id');
        const columnNameId = 'Instance HRID';
        BulkEditSearchPane.uncheckShowColumnCheckbox(columnNameId);
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude(columnNameId);

        TopMenuNavigation.navigateToApp('Bulk edit');
        BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Instance', 'Instance UUIDs');
        BulkEditSearchPane.uploadFile(invalidInstanceUUIDsFileName);
        BulkEditSearchPane.checkForUploading(invalidInstanceUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyErrorLabel(1);
        BulkEditSearchPane.verifyPaneRecordsCount('0 instance');
        BulkEditSearchPane.verifyNonMatchedResults(invalidInstanceUUID);
        BulkEditActions.openActions();
        BulkEditActions.downloadErrorsExists();
        BulkEditSearchPane.searchColumnNameTextfieldAbsent();
      },
    );
  });
});
