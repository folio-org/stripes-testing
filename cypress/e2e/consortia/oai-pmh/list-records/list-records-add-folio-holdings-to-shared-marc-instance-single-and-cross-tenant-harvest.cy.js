import {
  APPLICATION_NAMES,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../../support/fragments/inventory/inventoryNewHoldings';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  user: {},
  marcInstance: {
    title: `AT_C402379_MarcInstance_${getRandomPostfix()}`,
    uuid: null,
  },
  holdingsData: {
    callNumber: `Holdings_CN_${getRandomPostfix()}`,
  },
  locationName: null,
  electronicAccessData: {
    uri: `https://example.com/resource_${getRandomPostfix()}`,
    linkText: 'Link text',
    materialsSpecified: 'Materials specified',
    publicNote: 'Public note',
  },
  holdingsId: null,
};

describe('OAI-PMH', () => {
  describe('ListRecords', () => {
    describe('Consortia', () => {
      before('Create test data', function () {
        if (!OaiPmhEdge.isEdgeConfigured()) {
          this.skip();
        }
        cy.getAdminToken();
        // Configure OAI-PMH behavior for College tenant
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
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
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );
        // Configure OAI-PMH behavior for Central tenant
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );
        cy.createSimpleMarcBibViaAPI(testData.marcInstance.title).then((instanceId) => {
          testData.marcInstance.uuid = instanceId;
        });
        // Create user with permissions in both Central and College tenants
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
        if (testData.marcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        }
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C402379 Consortia | SRS | ListRecords |ListIdentifiers: Add FOLIO holdings to shared MARC instance in Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C402379', 'nonParallel'] },
        () => {
          // Step 1-2: Search for MARC Instance from Preconditions
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.instanceTitle);

          // Step 3: Verify instance NOT in current date OAI-PMH response
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          OaiPmhEdge.listRecordsRequest('marc21', OaiPmhEdge.getApiKey(Affiliations.College)).then(
            (response) => {
              // Step 4: Verify the response doesn't include MARC Instance with Instance UUID
              OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
            },
          );

          // Step 5-8: Add local FOLIO holdings with call number, electronic access, and location
          cy.resetTenant();
          cy.getUserToken(testData.user.username, testData.user.password);
          cy.setTenant(Affiliations.College);

          InventoryInstance.pressAddHoldingsButton();
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
          InventoryInstance.openHoldingView();
          HoldingsRecordView.getHoldingsIDInDetailView().then((holdingId) => {
            testData.holdingsId = holdingId;
          });

          // Step 9: ListRecords marc21 for College tenant (single-tenant harvest)
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listRecordsRequest('marc21', OaiPmhEdge.getApiKey(Affiliations.College)).then(
            (response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.marcInstance.uuid,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyMarcField(
                response,
                testData.marcInstance.uuid,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
            },
          );

          // Step 10: ListIdentifiers marc21 for College tenant
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

          // Step 11: ListRecords marc21_withholdings for College tenant
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );
          });

          // Step 12: ListIdentifiers marc21_withholdings for College tenant
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

          // Step 13: ListRecords oai_dc for College tenant
          OaiPmhEdge.listRecordsRequest('oai_dc', OaiPmhEdge.getApiKey(Affiliations.College)).then(
            (response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.marcInstance.uuid,
                false,
                true,
                Affiliations.College,
              );
            },
          );

          // Step 14: ListIdentifiers oai_dc for College tenant
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

          // Step 15: ListRecords marc21 for Central tenant (cross-tenant harvest)
          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );
            OaiPmh.verifyMarcFieldAbsent(response, testData.marcInstance.uuid, '952');
          });

          // Step 16: ListIdentifiers marc21 for Central tenant
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

          // Step 17: ListRecords marc21_withholdings for Central tenant
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );
          });

          // Step 18: ListIdentifiers marc21_withholdings for Central tenant
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

          // Step 19: ListRecords oai_dc for Central tenant
          OaiPmhEdge.listRecordsRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
          });

          // Step 20: ListIdentifiers oai_dc for Central tenant
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
        },
      );
    });
  });
});
