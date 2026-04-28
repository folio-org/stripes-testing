import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
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
    title: `AT_C409411_SharedMarcInstance_${getRandomPostfix()}`,
    uuid: null,
    hrid: null,
  },
  holdingsData: {
    callNumber: `Holdings_CN_${getRandomPostfix()}`,
    updatedCallNumber: null,
  },
  electronicAccessData: {
    uri: `https://example.com/resource_${getRandomPostfix()}`,
    linkText: 'Link text',
    materialsSpecified: 'Materials specified',
    publicNote: 'Public note',
  },
  holdingsId: null,
  locationName: null,
  locationId: null,
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
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.locationName = locations[0].name;
          testData.locationId = locations[0].id;
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

        // Create shared MARC instance in Central tenant
        cy.createSimpleMarcBibViaAPI(testData.marcInstance.title).then((instanceId) => {
          testData.marcInstance.uuid = instanceId;

          cy.getInstanceById(instanceId).then((instanceData) => {
            testData.marcInstance.hrid = instanceData.hrid;
          });

          // Switch to College tenant to add Holdings to the shared instance
          cy.setTenant(Affiliations.College);
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.marcInstance.uuid,
              permanentLocationId: testData.locationId,
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

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

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
        'C409411 Consortia | SRS | ListRecords | ListIdentifiers: Edit FOLIO Holdings of the shared MARC instance in Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C409411', 'nonParallel'] },
        () => {
          // Step 1-3: Search for shared MARC Instance with Holdings
          InventoryInstances.waitContentLoading();
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.marcInstance.title);
          InventoryInstance.openHoldingView();

          // Step 4-5: Verify instance NOT in current date OAI-PMH response before editing holdings
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          OaiPmhEdge.listRecordsRequest('marc21', OaiPmhEdge.getApiKey(Affiliations.College)).then(
            (response) => {
              OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
            },
          );

          // Step 6-9: Edit FOLIO Holdings record from College tenant
          cy.resetTenant();
          cy.getUserToken(testData.user.username, testData.user.password);
          cy.setTenant(Affiliations.College);

          HoldingsRecordView.waitLoading();
          HoldingsRecordView.edit();
          HoldingsRecordEdit.waitLoading();

          // Modify call number and add electronic access
          testData.holdingsData.updatedCallNumber = `${testData.holdingsData.callNumber}_Updated`;

          HoldingsRecordEdit.fillCallNumber(testData.holdingsData.updatedCallNumber);
          HoldingsRecordEdit.addElectronicAccessFields({
            relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            uri: testData.electronicAccessData.uri,
            linkText: testData.electronicAccessData.linkText,
            materialsSpecified: testData.electronicAccessData.materialsSpecified,
            urlPublicNote: testData.electronicAccessData.publicNote,
          });
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();

          // Verify that holdings record was updated on current date and time
          HoldingsRecordView.getRecordLastUpdatedDate().then((holdingsUpdateDate) => {
            cy.log(`Holdings update date: ${holdingsUpdateDate}`);
          });

          // Step 10: Close holdings view
          HoldingsRecordView.close();
          InventoryInstance.waitLoading();

          // Step 11: Single-tenant ListRecords marc21 (WITHOUT holdings data)
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
              // marc21 format does NOT include holdings data
              OaiPmh.verifyMarcFieldAbsent(response, testData.marcInstance.uuid, ['952', '856']);
            },
          );

          // Step 12: Single-tenant ListIdentifiers marc21
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

          // Step 13-14: Single-tenant ListRecords marc21_withholdings (WITH holdings data)
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
              { t: '0', e: testData.holdingsData.updatedCallNumber },
            );
            // Verify electronic access field 856
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '856',
              { ind1: '4', ind2: '0' },
              {
                u: testData.electronicAccessData.uri,
                y: testData.electronicAccessData.linkText,
                3: testData.electronicAccessData.materialsSpecified,
                z: testData.electronicAccessData.publicNote,
              },
            );
          });

          // Step 15: Single-tenant ListIdentifiers marc21_withholdings
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

          // Step 16: Single-tenant ListRecords oai_dc
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

          // Step 17: Single-tenant ListIdentifiers oai_dc
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

          // Step 18: Cross-tenant ListRecords marc21 (WITHOUT holdings data)
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
            // marc21 format does NOT include holdings data
            OaiPmh.verifyMarcFieldAbsent(response, testData.marcInstance.uuid, ['952', '856']);
          });

          // Step 19: Cross-tenant ListIdentifiers marc21
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

          // Step 20-21: Cross-tenant ListRecords marc21_withholdings (WITH holdings data)
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
              { t: '0', e: testData.holdingsData.updatedCallNumber },
            );
            // Verify electronic access field 856
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '856',
              { ind1: '4', ind2: '0' },
              {
                u: testData.electronicAccessData.uri,
                y: testData.electronicAccessData.linkText,
                3: testData.electronicAccessData.materialsSpecified,
                z: testData.electronicAccessData.publicNote,
              },
            );
          });

          // Step 22: Cross-tenant ListIdentifiers marc21_withholdings
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

          // Step 23: Cross-tenant ListRecords oai_dc
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

          // Step 24: Cross-tenant ListIdentifiers oai_dc
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
