import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DateTools from '../../../support/utils/dateTools';

let user;
let beforeDeletionTimestamp;
const folioInstance = {
  title: `AT_C380578_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          cy.getLocations({ limit: 1 }).then((location) => {
            cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
              cy.getDefaultMaterialType().then((materialType) => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId: instanceTypes[0].id,
                    title: folioInstance.title,
                  },
                  holdings: [
                    {
                      permanentLocationId: location.id,
                    },
                  ],
                  items: [
                    {
                      barcode: folioInstance.itemBarcode,
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                      permanentLoanType: { id: loanTypes[0].id },
                      materialType: { id: materialType.id },
                    },
                  ],
                }).then((instanceData) => {
                  folioInstance.id = instanceData.instanceId;
                  folioInstance.holdingsId = instanceData.holdingIds[0].id;
                  folioInstance.itemId = instanceData.holdingIds[0].itemIds[0];
                });
              });
            });
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });

        // For clear test results, wait to ensure item deletion is treated as an update
        cy.wait(60_000);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C380578 verb=ListIdentifiers: Verify that Instance FOLIO is retrieved in case its Item and Holdings are deleted (marc21_withholdings) (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C380578', 'nonParallel'] },
      () => {
        beforeDeletionTimestamp = DateTools.getCurrentDateForOaiPmh();

        // Step 1-3: Search for FOLIO instance
        InventoryInstances.searchByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 4-5: Verify Instance NOT in OAI-PMH initially (before any deletion)
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', beforeDeletionTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, folioInstance.id, false);
          },
        );

        // Step 6-7: Expand Holdings and navigate to Item
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(folioInstance.itemBarcode);
        ItemRecordView.waitLoading();

        // Step 8-9: Delete Item
        ItemRecordView.clickDeleteButton();
        ItemRecordView.waitLoading();
        ItemRecordView.clickDeleteButton();

        // Verify item deletion and return to instance view
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(folioInstance.title);

        // Step 10: Verify Instance IS in OAI-PMH after Item deletion
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', beforeDeletionTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, folioInstance.id, true);
          },
        );

        // Wait to ensure holdings deletion is treated as separate update
        cy.wait(60_000);

        const afterItemDeletionTimestamp = DateTools.getCurrentDateForOaiPmh();

        // Step 11-13: Delete Holdings record
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.delete();

        // Verify holdings deletion and return to instance view
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(folioInstance.title);

        // Step 14: Verify Instance IS in OAI-PMH after Holdings deletion
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterItemDeletionTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, folioInstance.id, true);
          },
        );
      },
    );
  });
});
