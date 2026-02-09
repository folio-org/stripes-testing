import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import DateTools from '../../../support/utils/dateTools';

let user;
let afterItemCreatedTimestamp;
const marcInstance = {
  title: `AT_C385649_MarcInstance_${getRandomPostfix()}`,
  itemBarcode: `barcode_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
          marcInstance.id = instanceId;

          cy.getInstanceById(marcInstance.id).then((instanceData) => {
            marcInstance.hrid = instanceData.hrid;

            cy.getLocations({ limit: 1 }).then((res) => {
              const location = res;

              cy.createSimpleMarcHoldingsViaAPI(
                marcInstance.id,
                marcInstance.hrid,
                location.code,
              ).then((holdingsId) => {
                marcInstance.holdingsId = holdingsId;

                cy.getHoldings({
                  limit: 1,
                  query: `"id"="${marcInstance.holdingsId}"`,
                }).then((holdings) => {
                  cy.updateHoldingRecord(marcInstance.holdingsId, {
                    ...holdings[0],
                    discoverySuppress: true,
                  });

                  cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
                    const loanTypeId = loanTypes[0].id;

                    cy.getDefaultMaterialType().then((materialType) => {
                      const materialTypeId = materialType.id;

                      InventoryItems.createItemViaApi({
                        barcode: marcInstance.itemBarcode,
                        holdingsRecordId: holdingsId,
                        materialType: { id: materialTypeId },
                        permanentLoanType: { id: loanTypeId },
                        status: { name: 'Available' },
                        discoverySuppress: true,
                      }).then((item) => {
                        marcInstance.itemId = item.id;
                      });
                    });
                  });
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C385649 verb=ListIdentifiers: SRS & Inventory - Verify that Instance MARC is retrieved in case its suppressed from discovery Item and Holdings are deleted (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C385649', 'nonParallel'] },
      () => {
        afterItemCreatedTimestamp = DateTools.getCurrentDateForOaiPmh();

        // Step 1-3: Go to Inventory app and find created MARC bib, verify instance NOT in OAI-PMH initially
        InventoryInstances.searchByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterItemCreatedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, false);
          },
        );

        // Step 4: Expand Holdings accordion
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldings(['']);

        // Step 5-7: Navigate to item, delete it
        InventoryInstance.openItemByBarcode(marcInstance.itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.clickDeleteButton();
        ItemRecordView.waitLoading();
        ItemRecordView.clickDeleteButton();

        // Verify item deletion and return to instance view
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(marcInstance.title);

        // Step 8: Verify that response contains the MARC Instance with associated Holdings and recently deleted Item
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterItemCreatedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, true);
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
        InventoryInstance.checkInstanceTitle(marcInstance.title);

        // Step 12: Send ListIdentifiers request and verify Instance MARC is now retrieved
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', afterItemDeletedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, true);
          },
        );
      },
    );
  });
});
