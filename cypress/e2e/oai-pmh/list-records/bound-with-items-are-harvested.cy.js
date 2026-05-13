import uuid from 'uuid';
import { ITEM_STATUS_NAMES } from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

const firstMarcInstance = { title: `AT_C411613_FirstMarcInstance_${getRandomPostfix()}` };
const secondMarcInstance = { title: `AT_C411613_SecondMarcInstance_${getRandomPostfix()}` };
const testData = {};

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('Create test data', () => {
      cy.getAdminToken();

      // Configure OAI-PMH settings
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      // Get reference data
      cy.getLocations({ limit: 1 }).then((location) => {
        testData.locationId = location.id;
        testData.locationCode = location.code;
      });

      cy.getDefaultMaterialType().then((res) => {
        testData.materialTypeId = res.id;
      });

      cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
        testData.loanTypeId = loanTypes[0].id;
      });

      InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
        testData.folioSourceId = folioSource.id;
      });

      cy.then(() => {
        // Create MARC instances with holdings and items
        [firstMarcInstance, secondMarcInstance].forEach((instance) => {
          cy.createSimpleMarcBibViaAPI(instance.title).then((instanceId) => {
            instance.id = instanceId;

            cy.getInstanceById(instance.id).then((instanceData) => {
              instance.hrid = instanceData.hrid;

              // Create holding for instance
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: instance.id,
                permanentLocationId: testData.locationId,
                sourceId: testData.folioSourceId,
              }).then((holding) => {
                instance.holdingId = holding.id;
                instance.holdingHrid = holding.hrid;

                // Create regular item for instance
                InventoryItems.createItemViaApi({
                  holdingsRecordId: instance.holdingId,
                  barcode: uuid(),
                  materialType: { id: testData.materialTypeId },
                  permanentLoanType: { id: testData.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  instance.regularItemId = item.id;
                  instance.regularItemBarcode = item.barcode;
                });
              });
            });
          });
        });
      });

      cy.then(() => {
        // Create bound-with item for first instance and bind to second instance's holding
        InventoryItems.createItemViaApi({
          holdingsRecordId: firstMarcInstance.holdingId,
          barcode: uuid(),
          materialType: { id: testData.materialTypeId },
          permanentLoanType: { id: testData.loanTypeId },
          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
        }).then((item) => {
          firstMarcInstance.boundWithItemId = item.id;
          firstMarcInstance.boundWithItemBarcode = item.barcode;

          // Bind this item to second instance's holding
          InventoryItems.boundItemWithHoldingViaApi(item.id, secondMarcInstance.holdingId);
        });
      });

      // Wait for OAI-PMH to index the bound-with relationship
      cy.wait(5000);
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi();

      // Unbind the bound-with item before deletion
      // Reset bound-with item to only its original holding
      InventoryItems.boundItemWithHoldingViaApi(
        firstMarcInstance.boundWithItemId,
        firstMarcInstance.holdingId,
      );

      // Delete instances with all holdings and items
      [firstMarcInstance, secondMarcInstance].forEach((instance) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      });
    });

    it(
      'C411613 ListRecords: SRS: Verify that bound-with items are retrieved in response (firebird)',
      { tags: ['extendedPath', 'firebird', 'C411613'] },
      () => {
        // Step 1: Send ListRecords request with marc21_withholdings
        const fromDate = DateTools.getCurrentDateForOaiPmh(-2);
        const untilDate = DateTools.getCurrentDateForOaiPmh(2);

        OaiPmh.listRecordsRequest('marc21_withholdings', fromDate, untilDate).then((response) => {
          // Step 2: Verify both instances are shown in the response
          // Verify first instance header
          OaiPmh.verifyOaiPmhRecordHeader(response, firstMarcInstance.id, false);

          // Verify second instance header
          OaiPmh.verifyOaiPmhRecordHeader(response, secondMarcInstance.id, false);

          // Verify first instance contains its basic information
          OaiPmh.verifyMarcField(
            response,
            firstMarcInstance.id,
            '245',
            { ind1: ' ', ind2: ' ' },
            { a: firstMarcInstance.title },
          );

          // Verify first instance contains instance ID in 999 field
          OaiPmh.verifyMarcField(
            response,
            firstMarcInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: firstMarcInstance.id },
          );

          // Verify second instance contains its basic information
          OaiPmh.verifyMarcField(
            response,
            secondMarcInstance.id,
            '245',
            { ind1: ' ', ind2: ' ' },
            { a: secondMarcInstance.title },
          );

          // Verify second instance contains instance ID in 999 field
          OaiPmh.verifyMarcField(
            response,
            secondMarcInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: secondMarcInstance.id },
          );

          // Verify first instance contains two 952 fields (regular item and bound-with item)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            firstMarcInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            [
              { m: firstMarcInstance.boundWithItemBarcode },
              { m: firstMarcInstance.regularItemBarcode },
            ],
            2,
          );

          // Verify second instance contains two 952 fields (regular item and bound-with item from first instance)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            secondMarcInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            [
              { m: secondMarcInstance.regularItemBarcode },
              { m: firstMarcInstance.boundWithItemBarcode },
            ],
            2,
          );
        });
      },
    );
  });
});
