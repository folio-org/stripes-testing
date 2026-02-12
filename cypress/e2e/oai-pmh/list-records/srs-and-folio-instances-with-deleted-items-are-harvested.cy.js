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
  marcInstance: {
    title: `AT_C375983_MarcInstance_${getRandomPostfix()}`,
    id: null,
    hrid: null,
    holdingsId: null,
    itemId: null,
    itemBarcode: `marc_item_${getRandomPostfix()}`,
  },
  folioInstance: {
    title: `AT_C375983_FolioInstance_${getRandomPostfix()}`,
    id: null,
    holdingsId: null,
    itemId: null,
    itemBarcode: `folio_item_${getRandomPostfix()}`,
  },
  locationName: LOCATION_NAMES.MAIN_LIBRARY_UI,
};

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('create test data', () => {
      cy.getAdminToken();

      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
          cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
            cy.getLocations({ query: `name=="${testData.locationName}"` }).then((location) => {
              // Create MARC instance with holdings and item
              cy.createSimpleMarcBibViaAPI(testData.marcInstance.title).then((marcInstanceId) => {
                testData.marcInstance.id = marcInstanceId;

                cy.getInstanceById(marcInstanceId).then((instanceData) => {
                  testData.marcInstance.hrid = instanceData.hrid;

                  cy.createSimpleMarcHoldingsViaAPI(
                    marcInstanceId,
                    instanceData.hrid,
                    location.code,
                  ).then((marcHoldingsId) => {
                    testData.marcInstance.holdingsId = marcHoldingsId;

                    InventoryItems.createItemViaApi({
                      barcode: testData.marcInstance.itemBarcode,
                      holdingsRecordId: marcHoldingsId,
                      materialType: { id: materialType.id },
                      permanentLoanType: { id: loanTypes[0].id },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    }).then((marcItem) => {
                      testData.marcInstance.itemId = marcItem.id;
                    });
                  });
                });
              });

              // Create FOLIO instance with holdings and item
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instanceTypes[0].id,
                  title: testData.folioInstance.title,
                },
              }).then((createdInstanceData) => {
                testData.folioInstance.id = createdInstanceData.instanceId;

                InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                  InventoryHoldings.createHoldingRecordViaApi({
                    instanceId: testData.folioInstance.id,
                    permanentLocationId: location.id,
                    sourceId: folioSource.id,
                  }).then((folioHolding) => {
                    testData.folioInstance.holdingsId = folioHolding.id;

                    InventoryItems.createItemViaApi({
                      barcode: testData.folioInstance.itemBarcode,
                      holdingsRecordId: folioHolding.id,
                      materialType: { id: materialType.id },
                      permanentLoanType: { id: loanTypes[0].id },
                      status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                    }).then((folioItem) => {
                      testData.folioInstance.itemId = folioItem.id;
                    });
                  });
                });
              });
            });
          });
        });
      });

      // Wait to ensure holdings and items creation is registered before deletion
      cy.wait(60_000);

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.marcInstance.id);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.folioInstance.id);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375983 ListRecords: SRS & Inventory - Verify that deleted SRS and FOLIO Items are harvested (marc21_withholdings) (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C375983', 'nonParallel'] },
      () => {
        // Step 1-2: Search for SRS instance with associated MARC Holdings and Item by Source filter
        InventorySearchAndFilter.selectSearchOptions(
          'Keyword (title, contributor, identifier, HRID, UUID)',
          'MARC',
        );
        InventoryInstances.searchByTitle(testData.marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 3: Open Holdings accordion and verify Item barcode hyperlink
        InventoryInstance.openHoldingsAccordion(testData.locationName);

        // Step 4: Click on Item's barcode hyperlink
        InventoryInstance.openItemByBarcodeAndIndex(testData.marcInstance.itemBarcode);
        ItemRecordView.waitLoading();

        const fromDate = DateTools.getCurrentDateForOaiPmh();

        // Step 5-6: Delete MARC item via Actions → Delete and confirm
        ItemRecordView.clickDeleteButton();
        ConfirmDeleteItemModal.waitLoading();
        ConfirmDeleteItemModal.clickDeleteButton();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyItemBarcode(testData.marcInstance.itemBarcode, false);

        // Step 7-8: Search for FOLIO instance with Holdings and Item by Source filter
        InventorySearchAndFilter.selectSearchOptions(
          'Keyword (title, contributor, identifier, HRID, UUID)',
          'FOLIO',
        );
        InventoryInstances.searchByTitle(testData.folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 9: Open Holdings accordion and verify Item barcode hyperlink
        InventoryInstance.openHoldingsAccordion(testData.locationName);

        // Step 10: Click on Item's barcode hyperlink
        InventoryInstance.openItemByBarcodeAndIndex(testData.folioInstance.itemBarcode);
        ItemRecordView.waitLoading();

        // Step 11-12: Delete FOLIO item via Actions → Delete and confirm
        ItemRecordView.clickDeleteButton();
        ConfirmDeleteItemModal.waitLoading();
        ConfirmDeleteItemModal.clickDeleteButton();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyItemBarcode(testData.folioInstance.itemBarcode, false);

        // Step 13: Send ListRecords request with date range and verify both instances appear
        cy.getAdminToken();
        const untilDate = DateTools.getCurrentDateForOaiPmh(1);

        OaiPmh.listRecordsRequest('marc21_withholdings', fromDate, untilDate).then((response) => {
          // Verify MARC instance is harvested
          OaiPmh.verifyMarcField(
            response,
            testData.marcInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: testData.marcInstance.id },
          );
          OaiPmh.verifyMarcField(
            response,
            testData.marcInstance.id,
            '245',
            { ind1: ' ', ind2: ' ' },
            { a: testData.marcInstance.title },
          );
          OaiPmh.verifyOaiPmhRecordHeader(response, testData.marcInstance.id, false, true);

          // Verify FOLIO instance is harvested
          OaiPmh.verifyMarcField(
            response,
            testData.folioInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: testData.folioInstance.id },
          );
          OaiPmh.verifyMarcField(
            response,
            testData.folioInstance.id,
            '245',
            { ind1: '0', ind2: '0' },
            { a: testData.folioInstance.title },
          );
          OaiPmh.verifyOaiPmhRecordHeader(response, testData.folioInstance.id, false, true);
        });
      },
    );
  });
});
