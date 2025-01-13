import permissions from '../../../support/dictionary/permissions';
import BulkEditActions from '../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import { LOCATION_IDS } from '../../../support/constants';

let user;
const validHoldingUUIDsFileName = `validHoldingUUIDs_${getRandomPostfix()}.csv`;
const item = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
  locationName: 'Popular Reading Collection',
};

const item2 = {
  instanceName: `testBulkEdit_${getRandomPostfix()}`,
  itemBarcode: getRandomPostfix(),
};

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditHoldings.gui,
      ]).then((userProperties) => {
        user = userProperties;

        const instanceId = InventoryInstances.createInstanceViaApi(
          item.instanceName,
          item.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${instanceId}"`,
        }).then((holdings) => {
          item.hrid = holdings[0].hrid;
          item.holdingId = holdings[0].id;
          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            temporaryLocationId: LOCATION_IDS.POPULAR_READING_COLLECTION,
          });
        });

        const instanceId2 = InventoryInstances.createInstanceViaApi(
          item2.instanceName,
          item2.itemBarcode,
        );
        cy.getHoldings({
          limit: 1,
          query: `"instanceId"="${instanceId2}"`,
        }).then((holdings) => {
          item2.hrid = holdings[0].hrid;
          item2.holdingId = holdings[0].id;
          cy.updateHoldingRecord(holdings[0].id, {
            ...holdings[0],
            temporaryLocationId: LOCATION_IDS.ANNEX,
          });
          FileManager.createFile(
            `cypress/fixtures/${validHoldingUUIDsFileName}`,
            `${item.holdingId}\r\n${item2.holdingId}`,
          );
        });
        cy.wait(3000);
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item.itemBarcode);
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(item2.itemBarcode);
      FileManager.deleteFile(`cypress/fixtures/${validHoldingUUIDsFileName}`);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C365126 Verify confirmation page after bulk editing holdings locations (firebird)',
      { tags: ['smoke', 'firebird', 'C365126'] },
      () => {
        BulkEditSearchPane.checkHoldingsRadio();
        BulkEditSearchPane.selectRecordIdentifier('Holdings UUIDs');
        BulkEditSearchPane.uploadFile(validHoldingUUIDsFileName);
        BulkEditSearchPane.waitFileUploading();
        BulkEditSearchPane.verifyMatchedResults(item.hrid, item2.hrid);

        BulkEditActions.openActions();
        BulkEditActions.openInAppStartBulkEditFrom();
        BulkEditActions.replaceTemporaryLocation(item.locationName, 'holdings');
        BulkEditActions.confirmChanges();
        BulkEditActions.commitChanges();
        BulkEditSearchPane.waitFileUploading();

        BulkEditSearchPane.verifyChangedResults(item2.hrid);
        BulkEditActions.verifySuccessBanner(1);
        BulkEditSearchPane.verifyErrorLabel(1);
      },
    );
  });
});
