import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import DateTools from '../../../support/utils/dateTools';
import { LOCATION_NAMES } from '../../../support/constants';

let user;
const testData = {
  instanceTitle: `AT_C375943_FolioInstance_${getRandomPostfix()}`,
  instanceId: null,
  holdingsId: null,
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
              });
            });
          });
        });
      });

      // Wait to ensure holdings creation is registered before deletion
      cy.wait(60_000);

      // Create user with required permissions
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
      'C375943 ListRecords: FOLIO instances with deleted Holdings are harvested with start and end date (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C375943', 'nonParallel'] },
      () => {
        // Step 1: Search for FOLIO instance with holdings by Source filter
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 2-3: Click "View holdings" button
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();

        const fromDate = DateTools.getCurrentDateForOaiPmh();

        // Step 4-5: Delete holdings via Actions → Delete and confirm
        HoldingsRecordView.delete();
        InventoryInstance.waitLoading();
        InventoryInstance.verifyHoldingsAbsent(testData.locationName);

        // Step 6: Send ListRecords request with date range and verify instance appears
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
