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

const firstFolioInstance = { title: `AT_C411617_FirstFolioInstance_${getRandomPostfix()}` };
const secondFolioInstance = { title: `AT_C411617_SecondFolioInstance_${getRandomPostfix()}` };
const testData = {};

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('Create test data', () => {
      cy.getAdminToken();

      // Configure OAI-PMH settings
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
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

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });

      InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
        testData.folioSourceId = folioSource.id;
      });

      cy.then(() => {
        // Create FOLIO instances with holdings and items
        [firstFolioInstance, secondFolioInstance].forEach((instance) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: instance.title,
            },
          }).then((createdInstanceData) => {
            instance.id = createdInstanceData.instanceId;

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
          holdingsRecordId: firstFolioInstance.holdingId,
          barcode: uuid(),
          materialType: { id: testData.materialTypeId },
          permanentLoanType: { id: testData.loanTypeId },
          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
        }).then((item) => {
          firstFolioInstance.boundWithItemId = item.id;
          firstFolioInstance.boundWithItemBarcode = item.barcode;

          // Bind this item to second instance's holding
          InventoryItems.boundItemWithHoldingViaApi(item.id, secondFolioInstance.holdingId);
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
        firstFolioInstance.boundWithItemId,
        firstFolioInstance.holdingId,
      );

      // Delete instances with all holdings and items
      [firstFolioInstance, secondFolioInstance].forEach((instance) => {
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
      });
    });

    it(
      'C411617 ListRecords: FOLIO: Verify that bound-with items are retrieved in response (firebird)',
      { tags: ['extendedPath', 'firebird', 'C4116170', 'nonParallel'] },
      () => {
        // Step 1: Send ListRecords request with marc21_withholdings
        const fromDate = DateTools.getCurrentDateForOaiPmh(-2);
        const untilDate = DateTools.getCurrentDateForOaiPmh(2);

        OaiPmh.listRecordsRequest('marc21_withholdings', fromDate, untilDate).then((response) => {
          // Step 2: Verify both instances are shown in the response
          // Verify first instance header
          OaiPmh.verifyOaiPmhRecordHeader(response, firstFolioInstance.id, false);

          // Verify second instance header
          OaiPmh.verifyOaiPmhRecordHeader(response, secondFolioInstance.id, false);

          // Verify first instance contains its basic information
          OaiPmh.verifyMarcField(
            response,
            firstFolioInstance.id,
            '245',
            { ind1: '0', ind2: '0' },
            { a: firstFolioInstance.title },
          );

          // Verify first instance contains instance ID in 999 field
          OaiPmh.verifyMarcField(
            response,
            firstFolioInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: firstFolioInstance.id },
          );

          // Verify second instance contains its basic information
          OaiPmh.verifyMarcField(
            response,
            secondFolioInstance.id,
            '245',
            { ind1: '0', ind2: '0' },
            { a: secondFolioInstance.title },
          );

          // Verify second instance contains instance ID in 999 field
          OaiPmh.verifyMarcField(
            response,
            secondFolioInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: secondFolioInstance.id },
          );

          // Verify first instance contains two 952 fields (regular item and bound-with item)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            firstFolioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            [
              { m: firstFolioInstance.boundWithItemBarcode },
              { m: firstFolioInstance.regularItemBarcode },
            ],
            2,
          );

          // Verify second instance contains two 952 fields (regular item and bound-with item from first instance)
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            secondFolioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            [
              { m: secondFolioInstance.regularItemBarcode },
              { m: firstFolioInstance.boundWithItemBarcode },
            ],
            2,
          );
        });
      },
    );
  });
});
