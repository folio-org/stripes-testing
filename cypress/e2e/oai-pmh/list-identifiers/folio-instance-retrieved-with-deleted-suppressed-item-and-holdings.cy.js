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
let afterItemCreatedTimestamp;
const folioInstance = {
  title: `AT_C385650_FolioInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          cy.getLocations({ limit: 1 }).then((res) => {
            cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
              cy.getDefaultMaterialType().then((materialType) => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId: instanceTypes[0].id,
                    title: folioInstance.title,
                  },
                  holdings: [
                    {
                      permanentLocationId: res.id,
                      discoverySuppress: true,
                    },
                  ],
                  items: [
                    {
                      barcode: folioInstance.itemBarcode,
                      status: { name: 'Available' },
                      permanentLoanType: { id: loanTypes[0].id },
                      materialType: { id: materialType.id },
                      discoverySuppress: true,
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

        // For clear test results, it is necessary to wait to ensure that
        // deleting item is treated as an update to the Instance record
        cy.wait(60_000);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C385650 verb=ListIdentifiers: SRS & Inventory - Verify that Instance FOLIO is retrieved in case its suppressed from discovery Item and Holdings are deleted (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C385650', 'nonParallel'] },
      () => {
        afterItemCreatedTimestamp = DateTools.getCurrentDateForOaiPmh();

        // Step 1-3: Go to Inventory app and find created FOLIO instance, verify instance NOT in OAI-PMH initially
        InventoryInstances.searchByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterItemCreatedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, folioInstance.id, false);
          },
        );

        // Step 4: Expand Holdings accordion
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldings(['']);

        // Step 5-7: Navigate to item, delete it
        InventoryInstance.openItemByBarcode(folioInstance.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.clickDeleteButton();
        ItemRecordView.waitLoading();
        ItemRecordView.clickDeleteButton();

        // Verify item deletion and return to instance view
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(folioInstance.title);

        // Step 8: Verify that response contains the FOLIO Instance with associated Holdings and recently deleted Item
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterItemCreatedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, folioInstance.id, true);
          },
        );

        // For clear test results, it is necessary to wait to ensure that
        // deleting holding is treated as an update to the Instance record
        cy.wait(60_000);

        const afterItemDeletedTimestamp = DateTools.getCurrentDateForOaiPmh();

        // Step 9-11: Delete the holdings record
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.delete();

        // Verify holdings deletion and return to instance view
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(folioInstance.title);

        // Step 12: Send ListIdentifiers request and verify Instance FOLIO is now retrieved
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterItemDeletedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, folioInstance.id, true);
          },
        );
      },
    );
  });
});
