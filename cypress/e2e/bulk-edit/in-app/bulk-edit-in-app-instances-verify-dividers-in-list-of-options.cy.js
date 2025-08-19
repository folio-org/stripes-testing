import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const folioInstance = {
  title: `AT_C648459_FolioInstance_${getRandomPostfix()}`,
};
const instanceUuidFileName = `instanceUuid_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([
        permissions.bulkEditEdit.gui,
        permissions.inventoryAll.gui,
        permissions.uiInventorySetRecordsForDeletion.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          const instanceTypeId = instanceTypes[0].id;

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: folioInstance.title,
            },
          }).then((createdInstanceData) => {
            folioInstance.instanceId = createdInstanceData.instanceId;

            FileManager.createFile(
              `cypress/fixtures/${instanceUuidFileName}`,
              folioInstance.instanceId,
            );
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(folioInstance.instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${instanceUuidFileName}`);
    });

    it(
      'C648459 Verify "Administrative Data" and "Instance notes" dividers are present in a list of options for Instances Bulk edit (firebird)',
      { tags: ['extendedPath', 'firebird', 'C648459'] },
      () => {
        BulkEditSearchPane.checkInstanceRadio();
        BulkEditSearchPane.verifyRecordTypeIdentifiers('Instances');
        BulkEditSearchPane.selectRecordIdentifier('Instance UUIDs');
        BulkEditSearchPane.uploadFile(instanceUuidFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(folioInstance.title);
        BulkEditActions.openActions();
        BulkEditActions.openStartBulkEditFolioInstanceForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyGroupOptionsInSelectOptionsInstanceDropdown();
        BulkEditActions.clickOptionsSelection();
        BulkEditActions.verifySelectOptionsInstanceSortedAlphabetically();
      },
    );
  });
});
