import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  user: {},
  folioInstance: {
    title: `AT_C422196_LocalFolioInstance_${getRandomPostfix()}`,
    id: null,
  },
  locationName: null,
  locationId: null,
  sourceId: null,
  holdingsId: null,
};

describe('OAI-PMH', () => {
  describe('ListRecords', () => {
    describe('Consortia', () => {
      // eslint-disable-next-line func-names
      before('Create test data', function () {
        if (!OaiPmhEdge.isEdgeConfigured()) {
          this.skip();
        }
        cy.getAdminToken();

        // Configure OAI-PMH behavior for College tenant
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        );

        // Get location and source for College tenant
        InventoryInstances.getLocations({ limit: 1, query: 'name<>"DCB"' }).then((location) => {
          testData.locationId = location[0].id;
          testData.locationName = location[0].name;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.sourceId = folioSource.id;
        });

        // Create local FOLIO instance in College tenant (Member-1)
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: testData.folioInstance.title,
            },
          }).then((createdInstanceData) => {
            testData.folioInstance.id = createdInstanceData.instanceId;

            // Create holdings in College tenant
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.folioInstance.id,
              permanentLocationId: testData.locationId,
              sourceId: testData.sourceId,
            }).then((holdingsData) => {
              testData.holdingsId = holdingsData.id;
            });
          });
        });

        // Create user with permissions in Central and College tenants
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        );
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: [Permissions.inventoryAll.gui],
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          cy.wait(120_000); // Wait for 2 minutes to ensure instance is created "in the past"
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        // Delete holdings and instance from College tenant
        cy.setTenant(Affiliations.College);
        if (testData.folioInstance.id) {
          InventoryInstance.deleteInstanceViaApi(testData.folioInstance.id);
        }
        Behavior.updateBehaviorConfigViaApi();

        cy.resetTenant();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C422196 Consortium| ListRecords: Local FOLIO instances with deleted Holdings are harvested with start and end date from Member (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C422196', 'nonParallel'] },
        () => {
          const fromDate = DateTools.getCurrentDateForOaiPmh();

          // Step 1-2: Go to Inventory app, select Holdings tab, and search for local FOLIO instance
          InventoryInstances.searchByTitle(testData.folioInstance.title);
          InventoryInstances.selectInstance();
          InventoryInstance.waitLoading();
          InventoryInstance.verifyInstanceTitle(testData.folioInstance.title);

          // Step 3: Click on "View holdings" button
          InventoryInstance.openHoldingView();
          HoldingsRecordView.waitLoading();

          // Step 4: Click "Actions" menu => Select "Delete" option
          // Step 5: Select "Delete" option in confirmation modal
          HoldingsRecordView.delete();
          InventoryInstance.waitLoading();
          InventoryInstance.verifyInstanceTitle(testData.folioInstance.title);
          InventoryInstance.verifyHoldingsAbsent(testData.locationName);

          // Step 6: Send single tenant harvest request via OAI-PMH
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            // Verify FOLIO instance with deleted holdings is retrieved
            // Deleting holdings record is treated as an update of Instance record
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.folioInstance.id,
              false,
              true,
              Affiliations.College,
            );
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
          });
        },
      );
    });
  });
});
