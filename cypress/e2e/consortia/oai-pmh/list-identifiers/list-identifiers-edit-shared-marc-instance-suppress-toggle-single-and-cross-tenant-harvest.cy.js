import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  user: {},
  marcInstance: {
    title: `AT_C402371_SharedMarcInstance_${getRandomPostfix()}`,
    uuid: null,
    hrid: null,
  },
  holdingsId: null,
  locationName: null,
};

describe('OAI-PMH', () => {
  describe('ListIdentifiers', () => {
    describe('Consortia', () => {
      // eslint-disable-next-line func-names
      before('Create test data', function () {
        if (!OaiPmhEdge.isEdgeConfigured()) {
          this.skip();
        }
        cy.getAdminToken();

        // Configure OAI-PMH behavior for College tenant with "Transfer suppressed records"
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );

        // Configure OAI-PMH behavior for University tenant
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );

        // Configure OAI-PMH behavior for Central tenant
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );

        // Create shared MARC instance in Central tenant (this makes it shared)
        cy.createSimpleMarcBibViaAPI(testData.marcInstance.title).then((instanceId) => {
          testData.marcInstance.uuid = instanceId;

          cy.getInstanceById(instanceId).then((instanceData) => {
            testData.marcInstance.hrid = instanceData.hrid;
          });
        });

        // Switch to College tenant to add Holdings to the shared instance
        cy.setTenant(Affiliations.College);
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.locationName = locations[0].name;
          const locationId = locations[0].id;

          // Create Holdings record in College tenant for the shared MARC instance
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.marcInstance.uuid,
              permanentLocationId: locationId,
              sourceId: folioSource.id,
            }).then((holding) => {
              testData.holdingsId = holding.id;
            });
          });
        });

        // Create user with permissions in Central and College tenants
        cy.resetTenant();
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: [Permissions.inventoryAll.gui],
          });

          cy.affiliateUserToTenant({
            tenantId: Affiliations.University,
            userId: testData.user.userId,
            permissions: [Permissions.inventoryAll.gui],
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

          cy.wait(120_000); // Wait for 2 minutes to ensure the instance is created "in the past"
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
        // Delete shared instance from Central tenant
        cy.resetTenant();
        if (testData.marcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();
        // Reset OAI-PMH settings for University tenant
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C402371 Consortia | SRS | ListIdentifiers | Suppressed with flag | Skip suppressed | Edit shared MARC instance (with associated Holdings in Member tenant) from Central tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C402371', 'nonParallel'] },
        () => {
          // Step 1-2: Search for shared MARC Instance with Holdings
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.marcInstance.title);
          InventoryInstance.expandConsortiaHoldings();
          InventoryInstance.expandMemberSubHoldings(tenantNames.college);
          InventoryInstance.openHoldingsAccordion(testData.locationName);

          // Step 3-4: Verify instance NOT in current date OAI-PMH response before editing
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });

          // Step 5-6: Edit instance to suppress from discovery
          cy.resetTenant();
          cy.getUserToken(testData.user.username, testData.user.password);
          cy.setTenant(Affiliations.College);

          InventoryInstance.editInstance();
          InstanceRecordEdit.waitLoading(testData.marcInstance.title);
          InstanceRecordEdit.clickDiscoverySuppressCheckbox();
          InstanceRecordEdit.saveAndClose();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();

          // Step 7: Single-tenant ListIdentifiers marc21 (WITH suppressed - flag transfer)
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 8: Single-tenant ListIdentifiers marc21_withholdings (WITH suppressed)
          OaiPmhEdge.listIdentifiersRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 9: Single-tenant ListIdentifiers oai_dc (WITH suppressed)
          OaiPmhEdge.listIdentifiersRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 10: Cross-tenant ListIdentifiers marc21 (WITH suppressed)
          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 11: Cross-tenant ListIdentifiers marc21_withholdings (WITH suppressed)
          OaiPmhEdge.listIdentifiersRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 12: Cross-tenant ListIdentifiers oai_dc (WITH suppressed)
          OaiPmhEdge.listIdentifiersRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 13: Change OAI-PMH settings to "Skip suppressed from discovery records"
          cy.resetTenant();
          cy.getAdminToken();

          // Update College tenant settings
          cy.setTenant(Affiliations.College);
          Behavior.updateBehaviorConfigViaApi(
            BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
            BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
          );

          // Update University tenant settings
          cy.setTenant(Affiliations.University);
          Behavior.updateBehaviorConfigViaApi(
            BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
            BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
          );

          // Update Central tenant settings
          cy.resetTenant();
          Behavior.updateBehaviorConfigViaApi(
            BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
            BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
          );

          // Step 14: Single-tenant ListIdentifiers marc21 (WITHOUT suppressed - skip)
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });

          // Step 15: Single-tenant ListIdentifiers marc21_withholdings (WITHOUT suppressed)
          OaiPmhEdge.listIdentifiersRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });

          // Step 16: Single-tenant ListIdentifiers oai_dc (WITHOUT suppressed)
          OaiPmhEdge.listIdentifiersRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });

          // Step 17: Cross-tenant ListIdentifiers marc21 (WITHOUT suppressed)
          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });

          // Step 18: Cross-tenant ListIdentifiers marc21_withholdings (WITHOUT suppressed)
          OaiPmhEdge.listIdentifiersRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });

          // Step 19: Cross-tenant ListIdentifiers oai_dc (WITHOUT suppressed)
          OaiPmhEdge.listIdentifiersRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
          });
        },
      );
    });
  });
});
