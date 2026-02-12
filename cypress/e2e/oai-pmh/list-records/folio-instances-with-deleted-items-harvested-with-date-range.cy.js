import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ConfirmDeleteItemModal from '../../../support/fragments/inventory/modals/confirmDeleteItemModal';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import DateTools from '../../../support/utils/dateTools';
import { LOCATION_NAMES, ITEM_STATUS_NAMES } from '../../../support/constants';

let user;
const testData = {
  instanceTitle: `AT_C375945_FolioInstance_${getRandomPostfix()}`,
  instanceId: null,
  holdingsId: null,
  itemId: null,
  itemBarcode: `item${getRandomPostfix()}`,
  locationName: LOCATION_NAMES.MAIN_LIBRARY_UI,
};

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('create test data', () => {
      cy.getAdminToken();

      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        cy.getMaterialTypes({ limit: 1 }).then((materialTypes) => {
          cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceTypes[0].id,
                title: testData.instanceTitle,
              },
            }).then((createdInstanceData) => {
              testData.instanceId = createdInstanceData.instanceId;

              cy.getLocations({ query: `name=="${testData.locationName}"` }).then((location) => {
                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: testData.instanceId,
                    permanentLocationId: location.id,
                    sourceId: folioSource.id,
                  }).then((holding) => {
                    testData.holdingsId = holding.id;

                    InventoryItems.createItemViaApi({
                      barcode: testData.itemBarcode,
                      holdingsRecordId: testData.holdingsId,
                      materialType: { id: materialTypes.id },
                      permanentLoanType: { id: loanTypes[0].id },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    }).then((item) => {
                      testData.itemId = item.id;
                    });
                  });
                });
              });
            });
          });
        });
      });

      // Wait to ensure holdings and item creation is registered before deletion
      cy.wait(60_000);

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375945 ListRecords: FOLIO instances with deleted  Items are harvested with start and end date (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C375945', 'nonParallel'] },
      () => {
        // Step 1: Search for FOLIO instance with holdings and item by Source filter
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 2-3: Open Holdings accordion and click on Item's barcode hyperlink
        InventoryInstance.openHoldingsAccordion(testData.locationName);
        InventoryInstance.openItemByBarcodeAndIndex(testData.itemBarcode);
        ItemRecordView.waitLoading();

        const fromDate = DateTools.getCurrentDateForOaiPmh();

        // Step 4-5: Delete item via Actions → Delete and confirm
        ItemRecordView.clickDeleteButton();
        ConfirmDeleteItemModal.waitLoading();
        ConfirmDeleteItemModal.clickDeleteButton();
        InventoryInstance.waitLoading();

        // Step 6: Verify item is deleted
        InventoryInstance.verifyItemBarcode(testData.itemBarcode, false);

        // Step 7: Send ListRecords request with date range and verify instance appears
        cy.getAdminToken();
        const untilDate = DateTools.getCurrentDateForOaiPmh(1);

        OaiPmh.listRecordsRequest('marc21_withholdings', fromDate, untilDate).then((response) => {
          // Verify instance is harvested (deletion treated as instance update)
          OaiPmh.verifyMarcField(
            response,
            testData.instanceId,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: testData.instanceId },
          );
          OaiPmh.verifyMarcField(
            response,
            testData.instanceId,
            '245',
            { ind1: '0', ind2: '0' },
            { a: testData.instanceTitle },
          );
          OaiPmh.verifyOaiPmhRecordHeader(response, testData.instanceId, false, true);
        });
      },
    );
  });
});
