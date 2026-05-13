import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../../support/fragments/inventory/inventoryNewHoldings';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';

const testData = {
  user: {},
  folioInstance: {
    title: `AT_C409486_SharedFolioInstance_${getRandomPostfix()}`,
    id: null,
    instanceTypeId: null,
  },
  holdingsData: {
    callNumber: `Holdings_CN_${getRandomPostfix()}`,
  },
  locationName: '',
  electronicAccessData: {
    uri: `https://example.com/resource_${getRandomPostfix()}`,
    linkText: 'Link text',
    materialsSpecified: 'Materials specified',
    publicNote: 'Public note',
  },
  holdingsId: null,
  currentDate: null,
};

const userPermissions = [Permissions.inventoryAll.gui];

describe('OAI-PMH', () => {
  describe('ListRecords', () => {
    describe('Consortia', () => {
      // eslint-disable-next-line func-names
      before('Create test data', function () {
        // Skip test if Edge configuration is not available
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

        // Get location for holdings from College tenant
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.locationName = locations[0].name;
        });

        // Configure OAI-PMH behavior for University tenant
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        );

        // Configure OAI-PMH behavior for Central tenant
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        );

        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.folioInstance.instanceTypeId = instanceTypes[0].id;

          // Create shared FOLIO instance in Central tenant (simulating "created in past")
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.folioInstance.instanceTypeId,
              title: testData.folioInstance.title,
            },
          }).then((instance) => {
            testData.folioInstance.id = instance.instanceId;
          });
        });

        // Create user with permissions in both Central and College tenants
        cy.createTempUser(userPermissions).then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: userPermissions,
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          cy.wait(120_000); // Wait for 2 minutes to ensure the instance is created "in the past" for OAI-PMH requests with current date as from/until
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        // Delete holdings from College tenant
        cy.setTenant(Affiliations.College);
        if (testData.holdingsId) {
          cy.deleteHoldingRecordViaApi(testData.holdingsId);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Reset OAI-PMH settings for University tenant
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi();

        // Delete instance from Central tenant
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi();
        if (testData.folioInstance.id) {
          InventoryInstance.deleteInstanceViaApi(testData.folioInstance.id);
        }
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C409486 Consortia | Inventory | ListRecords |ListIdentifiers: Add local FOLIO Holdings to shared FOLIO instance in Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C409486', 'nonParallel'] },
        () => {
          const fromDate = DateTools.getCurrentDateForOaiPmh();

          // Step 1-2: Search for the instance created in Preconditions and note Instance UUID
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.folioInstance.title);
          InventoryInstance.waitInstanceRecordViewOpened(testData.folioInstance.title);

          // Step 3: Verify instance NOT in current date OAI-PMH response
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            // Step 4: Verify the response doesn't include the FOLIO instance
            OaiPmh.verifyIdentifierInListResponse(response, testData.folioInstance.id, false);
          });

          // Step 5: Add holdings by clicking on the "Add holdings" button
          cy.resetTenant();
          cy.getUserToken(testData.user.username, testData.user.password);
          cy.setTenant(Affiliations.College);
          InventoryInstance.pressAddHoldingsButton();

          // Step 6: Add values to Holdings record and save
          InventoryNewHoldings.fillPermanentLocation(testData.locationName);
          InventoryNewHoldings.fillCallNumber(testData.holdingsData.callNumber);
          HoldingsRecordEdit.addElectronicAccessFields({
            relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            uri: testData.electronicAccessData.uri,
            linkText: testData.electronicAccessData.linkText,
            materialsSpecified: testData.electronicAccessData.materialsSpecified,
            urlPublicNote: testData.electronicAccessData.publicNote,
          });
          HoldingsRecordEdit.saveAndClose();
          InventoryInstance.checkIsHoldingsCreated([testData.locationName]);
          InventoryInstance.waitLoading();

          // Step 7: Close holdings view and note instance UUID
          InventoryInstance.openHoldingView();
          HoldingsRecordView.getHoldingsIDInDetailView().then((holdingId) => {
            testData.holdingsId = holdingId;
          });
          HoldingsRecordView.close();
          InventoryInstance.verifyInstanceTitle(testData.folioInstance.title);

          // Step 8: ListRecords marc21 for College tenant
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
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
              { t: '0' },
            );
          });

          // Step 9: ListIdentifiers marc21 for College tenant
          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.id,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 10: ListRecords marc21_withholdings for College tenant
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
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
              { t: '0' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.folioInstance.id,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );
          });

          // Step 11: ListIdentifiers marc21_withholdings for College tenant
          OaiPmhEdge.listIdentifiersRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.id,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 12: ListRecords oai_dc for College tenant
          OaiPmhEdge.listRecordsRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.folioInstance.id,
              false,
              true,
              Affiliations.College,
            );
          });

          // Step 13: ListIdentifiers oai_dc for College tenant
          OaiPmhEdge.listIdentifiersRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.id,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 14: ListRecords marc21 for Central tenant (all members)
          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
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
              { t: '0' },
            );
          });

          // Step 15: ListIdentifiers marc21 for Central tenant
          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.id,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 16: ListRecords marc21_withholdings for Central tenant
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
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
              { t: '0' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.folioInstance.id,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );
          });

          // Step 17: ListIdentifiers marc21_withholdings for Central tenant
          OaiPmhEdge.listIdentifiersRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.id,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 18: ListRecords oai_dc for Central tenant
          OaiPmhEdge.listRecordsRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.folioInstance.id,
              false,
              true,
              Affiliations.College,
            );
          });

          // Step 19: ListIdentifiers oai_dc for Central tenant
          OaiPmhEdge.listIdentifiersRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.id,
              true,
              false,
              Affiliations.College,
            );
          });
        },
      );
    });
  });
});
