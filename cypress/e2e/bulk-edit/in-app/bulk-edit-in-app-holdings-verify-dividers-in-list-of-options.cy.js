import { BULK_EDIT_TABLE_COLUMN_HEADERS } from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const folioInstance = {
  title: `AT_C648461_FolioInstance_${getRandomPostfix()}`,
};
const holdingUuidFileName = `holdingUuid_${getRandomPostfix()}.csv`;

describe('Bulk-edit', () => {
  describe('In-app approach', () => {
    before('create test data', () => {
      cy.clearLocalStorage();
      cy.createTempUser([permissions.bulkEditEdit.gui, permissions.inventoryAll.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            const instanceTypeId = instanceTypes[0].id;

            cy.getHoldingTypes({ limit: 1 }).then((holdingTypeData) => {
              const holdingTypeId = holdingTypeData[0].id;

              cy.getLocations({ limit: 1 }).then((locationData) => {
                const locationId = locationData.id;

                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: folioInstance.title,
                  },
                  holdings: [
                    {
                      holdingsTypeId: holdingTypeId,
                      permanentLocationId: locationId,
                    },
                  ],
                }).then((createdInstanceData) => {
                  folioInstance.instanceId = createdInstanceData.instanceId;
                  folioInstance.holdingId = createdInstanceData.holdingIds[0].id;

                  FileManager.createFile(
                    `cypress/fixtures/${holdingUuidFileName}`,
                    folioInstance.holdingId,
                  );
                });
              });
            });
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.instanceId);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${holdingUuidFileName}`);
    });

    it(
      'C648461 Verify "Administrative data", "Electronic access", "Holdings Notes" and "Location" dividers are present in a list of options for Holdings Bulk edit (firebird)',
      { tags: ['extendedPath', 'firebird', 'C648461'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.verifyRecordTypeIdentifiers('Holdings');
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.uploadFile(holdingUuidFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditActions.openActions();
        BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
          BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.INSTANCE,
        );
        BulkEditSearchPane.verifyMatchedResults(folioInstance.title);
        BulkEditActions.openStartBulkEditForm();
        BulkEditActions.verifyBulkEditsAccordionExists();
        BulkEditActions.verifyOptionsDropdown();
        BulkEditActions.verifyRowIcons();
        BulkEditActions.verifyGroupOptionsInSelectOptionsDropdown('holding');
      },
    );
  });
});
