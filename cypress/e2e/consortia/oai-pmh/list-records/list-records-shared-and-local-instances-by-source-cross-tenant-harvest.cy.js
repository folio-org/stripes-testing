import Affiliations from '../../../../support/dictionary/affiliations';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  sharedMarcInstance: {
    title: `AT_C422180_SharedMarcInstance_${getRandomPostfix()}`,
    uuid: null,
  },
  sharedFolioInstance: {
    title: `AT_C422180_SharedFolioInstance_${getRandomPostfix()}`,
    uuid: null,
  },
  localMarcInstance: {
    title: `AT_C422180_LocalMarcInstance_${getRandomPostfix()}`,
    uuid: null,
  },
  localFolioInstance: {
    title: `AT_C422180_LocalFolioInstance_${getRandomPostfix()}`,
    uuid: null,
  },
  instanceTypeId: null,
  holdingsIds: {
    sharedMarcCollege: null,
    sharedMarcUniversity: null,
    sharedFolioCollege: null,
    sharedFolioUniversity: null,
  },
  locationIds: {
    college: null,
    university: null,
  },
  locationNames: {
    college: null,
    university: null,
  },
};

// Helper function to create holdings for an instance in a tenant
function createHoldingsInTenant(data, instanceId, locationId, tenant, holdingsKey) {
  cy.setTenant(tenant);
  InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
    InventoryHoldings.createHoldingRecordViaApi({
      instanceId,
      permanentLocationId: locationId,
      sourceId: folioSource.id,
    }).then((holding) => {
      data.holdingsIds[holdingsKey] = holding.id;
    });
  });
}

// Helper function to verify MARC instance in response (SRS source)
function verifyMarcInstanceInResponse(response, instanceUuid, tenant) {
  OaiPmh.verifyOaiPmhRecordHeader(response, instanceUuid, false, true, tenant);
  OaiPmh.verifyMarcField(response, instanceUuid, '999', { ind1: 'f', ind2: 'f' }, { t: '0' });
}

// Helper function to verify FOLIO instance in response (Inventory source)
function verifyFolioInstanceInResponse(response, instanceUuid, tenant) {
  OaiPmh.verifyOaiPmhRecordHeader(response, instanceUuid, false, true, tenant);
  OaiPmh.verifyMarcField(
    response,
    instanceUuid,
    '999',
    { ind1: 'f', ind2: 'f' },
    { i: instanceUuid },
  );
}

describe('OAI-PMH', () => {
  describe('ListRecords', () => {
    describe('Consortia', () => {
      // eslint-disable-next-line func-names
      before('Create test data', function () {
        if (!OaiPmhEdge.isEdgeConfigured()) {
          this.skip();
        }

        cy.getAdminToken();

        // Get instance type ID
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;

          // Configure OAI-PMH behavior for College tenant (Member-1): SRS source
          cy.setTenant(Affiliations.College);
          Behavior.updateBehaviorConfigViaApi(
            BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
            BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
          );
          InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
            const locations = resp.filter((location) => location.name !== 'DCB');
            testData.locationIds.college = locations[0].id;
            testData.locationNames.college = locations[0].name;
          });

          // Configure OAI-PMH behavior for University tenant (Member-2): Inventory source
          cy.setTenant(Affiliations.University);
          Behavior.updateBehaviorConfigViaApi(
            BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
            BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
          );
          InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
            const locations = resp.filter((location) => location.name !== 'DCB');
            testData.locationIds.university = locations[0].id;
            testData.locationNames.university = locations[0].name;
          });

          // Configure OAI-PMH behavior for Central tenant
          cy.resetTenant();
          Behavior.updateBehaviorConfigViaApi(
            BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
            BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
          );

          // Create shared MARC instance in Central tenant
          cy.createSimpleMarcBibViaAPI(testData.sharedMarcInstance.title).then((instanceId) => {
            testData.sharedMarcInstance.uuid = instanceId;

            // Add Holdings in both member tenants
            createHoldingsInTenant(
              testData,
              instanceId,
              testData.locationIds.college,
              Affiliations.College,
              'sharedMarcCollege',
            );
            createHoldingsInTenant(
              testData,
              instanceId,
              testData.locationIds.university,
              Affiliations.University,
              'sharedMarcUniversity',
            );
          });

          // Create shared FOLIO instance in Central tenant
          cy.resetTenant();
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.sharedFolioInstance.title,
            },
          }).then((createdInstance) => {
            testData.sharedFolioInstance.uuid = createdInstance.instanceId;

            // Add Holdings in both member tenants
            createHoldingsInTenant(
              testData,
              createdInstance.instanceId,
              testData.locationIds.college,
              Affiliations.College,
              'sharedFolioCollege',
            );
            createHoldingsInTenant(
              testData,
              createdInstance.instanceId,
              testData.locationIds.university,
              Affiliations.University,
              'sharedFolioUniversity',
            );
          });

          // Create local FOLIO instance in University tenant (Member-2)
          cy.setTenant(Affiliations.University);
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.localFolioInstance.title,
            },
          }).then((createdInstance) => {
            testData.localFolioInstance.uuid = createdInstance.instanceId;
          });

          // Create local MARC instance in College tenant (Member-1)
          cy.setTenant(Affiliations.College);
          cy.createSimpleMarcBibViaAPI(testData.localMarcInstance.title).then((instanceId) => {
            testData.localMarcInstance.uuid = instanceId;
          });
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        // Delete holdings and local MARC instance from College tenant
        cy.setTenant(Affiliations.College);
        if (testData.holdingsIds.sharedMarcCollege) {
          cy.deleteHoldingRecordViaApi(testData.holdingsIds.sharedMarcCollege);
        }
        if (testData.holdingsIds.sharedFolioCollege) {
          cy.deleteHoldingRecordViaApi(testData.holdingsIds.sharedFolioCollege);
        }
        if (testData.localMarcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.localMarcInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Delete holdings and local FOLIO instance from University tenant
        cy.setTenant(Affiliations.University);
        if (testData.holdingsIds.sharedMarcUniversity) {
          cy.deleteHoldingRecordViaApi(testData.holdingsIds.sharedMarcUniversity);
        }
        if (testData.holdingsIds.sharedFolioUniversity) {
          cy.deleteHoldingRecordViaApi(testData.holdingsIds.sharedFolioUniversity);
        }
        if (testData.localFolioInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.localFolioInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Delete shared instances from Central tenant
        cy.resetTenant();
        if (testData.sharedMarcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.sharedMarcInstance.uuid);
        }
        if (testData.sharedFolioInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.sharedFolioInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();
      });

      it(
        'C422180 Consortia | ListRecord: Shared Instances and local instances are retrieved in the response according source for each tenant (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C422180', 'nonParallel'] },
        () => {
          // Step 1: Cross-tenant ListRecords marc21 request
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          let resumptionToken;

          // First request - College tenant records with SRS source (MARC instances)
          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            // Extract resumption token for next page (University tenant)
            resumptionToken = OaiPmh.extractResumptionToken(response);

            // Verify MARC instances from College tenant (SRS source)
            verifyMarcInstanceInResponse(
              response,
              testData.sharedMarcInstance.uuid,
              Affiliations.College,
            );
            verifyMarcInstanceInResponse(
              response,
              testData.localMarcInstance.uuid,
              Affiliations.College,
            );

            // Verify FOLIO instances NOT in College response (SRS source - no Inventory)
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.sharedFolioInstance.uuid,
              false,
            );
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.localFolioInstance.uuid,
              false,
            );
          });

          // Second request with resumptionToken - University tenant records with Inventory source (FOLIO instances)
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.University);

            OaiPmhEdge.listRecordsRequestWithResumptionToken(
              resumptionToken,
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              // Verify FOLIO instances from University tenant (Inventory source)
              verifyFolioInstanceInResponse(
                response,
                testData.sharedFolioInstance.uuid,
                Affiliations.University,
              );
              verifyFolioInstanceInResponse(
                response,
                testData.localFolioInstance.uuid,
                Affiliations.University,
              );

              // Verify MARC instances NOT in University response (Inventory source - no SRS)
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.sharedMarcInstance.uuid,
                false,
              );
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.localMarcInstance.uuid,
                false,
              );
            });
          });

          // Step 2: Cross-tenant ListRecords marc21_withholdings request
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);

            let resumptionTokenWithholdings;

            // First request - College tenant records with SRS source (MARC instances)
            OaiPmhEdge.listRecordsRequest(
              'marc21_withholdings',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              // Extract resumption token for next page (University tenant)
              resumptionTokenWithholdings = OaiPmh.extractResumptionToken(response);

              // Verify shared MARC instance from College tenant (SRS source)
              verifyMarcInstanceInResponse(
                response,
                testData.sharedMarcInstance.uuid,
                Affiliations.College,
              );
              // Verify 952 field (holdings) is present
              OaiPmh.verifyMarcField(
                response,
                testData.sharedMarcInstance.uuid,
                '952',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );

              // Verify local MARC instance from College tenant (SRS source)
              verifyMarcInstanceInResponse(
                response,
                testData.localMarcInstance.uuid,
                Affiliations.College,
              );

              // Verify FOLIO instances NOT in College response (SRS source - no Inventory)
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.sharedFolioInstance.uuid,
                false,
              );
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.localFolioInstance.uuid,
                false,
              );

              // Second request with resumptionToken - University tenant records
              cy.resetTenant();
              cy.getAdminToken();
              cy.setTenant(Affiliations.University);

              OaiPmhEdge.listRecordsRequestWithResumptionToken(
                resumptionTokenWithholdings,
                OaiPmhEdge.getApiKey(Affiliations.Consortia),
              ).then((responseUniversity) => {
                // Verify shared FOLIO instance from University tenant (Inventory source)
                verifyFolioInstanceInResponse(
                  responseUniversity,
                  testData.sharedFolioInstance.uuid,
                  Affiliations.University,
                );
                // Verify 952 field (holdings) with location name
                OaiPmh.verifyMarcField(
                  responseUniversity,
                  testData.sharedFolioInstance.uuid,
                  '952',
                  { ind1: 'f', ind2: 'f' },
                  { s: testData.locationNames.university },
                );

                // Verify local FOLIO instance from University tenant (Inventory source)
                verifyFolioInstanceInResponse(
                  responseUniversity,
                  testData.localFolioInstance.uuid,
                  Affiliations.University,
                );

                // Verify MARC instances NOT in University response (Inventory source - no SRS)
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.sharedMarcInstance.uuid,
                  false,
                );
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.localMarcInstance.uuid,
                  false,
                );
              });
            });
          });
        },
      );
    });
  });
});
