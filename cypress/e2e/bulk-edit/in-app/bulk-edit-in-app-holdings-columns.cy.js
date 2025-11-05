import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const holdingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.bulkEditUpdateRecords.gui,
        permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        item.instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${item.instanceId}"`,
        }).then((holdings) => {
          FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, holdings[0].id);
        });
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
    });

    it(
      'C389577 Verify that previews contains renamed "Instance (Title, Publisher, Publication date)" column (firebird) (TaaS)',
      { tags: ['extendedPath', 'firebird', 'C389577'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        [
          'Suppress from discovery',
          'Holdings HRID',
          'Source',
          'Holdings type',
          'Holdings permanent location',
        ].forEach((title) => {
          BulkEditSearchPane.verifyResultColumnTitles(title);
        });
        BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);
        BulkEditSearchPane.verifyHoldingActionShowColumns();

        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet('Tags');
        BulkEditSearchPane.changeShowColumnCheckbox('Tags');
        BulkEditSearchPane.verifyResultColumnTitlesDoNotInclude('Tags');
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          'Instance (Title, Publisher, Publication date)',
        );
        BulkEditSearchPane.verifyChangesUnderColumns(
          'Instance (Title, Publisher, Publication date)',
          item.instanceName,
        );

        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.clearTemporaryLocation('holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.verifySuccessBanner(1);
        BulkEditActions.openActions();
      },
    );
  });
});
