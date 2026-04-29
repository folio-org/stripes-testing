import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  user: {},
  marcInstance: {
    title: `AT_C422181_SharedMarcInstance_${getRandomPostfix()}`,
    uuid: null,
  },
  folioInstance: {
    title: `AT_C422181_SharedFolioInstance_${getRandomPostfix()}`,
    uuid: null,
  },
  college: {
    locationId: null,
    locationName: null,
    sourceId: null,
    marcHoldingsId: null,
    folioHoldingsId: null,
  },
  university: {
    locationId: null,
    sourceId: null,
    marcHoldingsId: null,
    folioHoldingsId: null,
  },
};

describe('OAI-PMH', () => {
  describe('ListRecords', () => {
    describe('Consortia', () => {
      // eslint-disable-next-line func-names
      before('Create test data', function () {
        if (!OaiPmhEdge.isEdgeConfigured()) {
          this.skip();
        }

        cy.getAdminToken()
          .then(() => {
            // Configure OAI-PMH behavior for College tenant (Member-1) - Transfer suppressed with flag
            cy.setTenant(Affiliations.College);
            Behavior.updateBehaviorConfigViaApi(
              BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
              BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
            );
            InventoryInstances.getLocations({ limit: 1, query: 'name<>"DCB"' }).then((location) => {
              testData.college.locationId = location[0].id;
              testData.college.locationName = location[0].name;
            });

            // Configure OAI-PMH behavior for University tenant (Member-2) - Skip suppressed
            cy.setTenant(Affiliations.University);
            Behavior.updateBehaviorConfigViaApi(
              BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
              BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
            );
            InventoryInstances.getLocations({ limit: 1, query: 'name<>"DCB"' }).then((location) => {
              testData.university.locationId = location[0].id;
            });
          })
          .then(() => {
            // Create shared MARC instance in Central tenant (not suppressed initially)
            cy.resetTenant();
            cy.createSimpleMarcBibViaAPI(testData.marcInstance.title).then((instanceId) => {
              testData.marcInstance.uuid = instanceId;

              // Add holdings to shared MARC instance in Member-1 (College)
              cy.setTenant(Affiliations.College);
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                testData.college.sourceId = folioSource.id;
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId,
                  permanentLocationId: testData.college.locationId,
                  sourceId: folioSource.id,
                }).then((holding) => {
                  testData.college.marcHoldingsId = holding.id;
                });
              });

              // Add holdings to shared MARC instance in Member-2 (University)
              cy.setTenant(Affiliations.University);
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                testData.university.sourceId = folioSource.id;
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId,
                  permanentLocationId: testData.university.locationId,
                  sourceId: folioSource.id,
                }).then((holding) => {
                  testData.university.marcHoldingsId = holding.id;
                });
              });
            });

            // Create shared FOLIO instance in Central tenant (not suppressed initially)
            cy.resetTenant();
            InventoryInstance.createInstanceViaApi({
              instanceTitle: testData.folioInstance.title,
            }).then(({ instanceData }) => {
              testData.folioInstance.uuid = instanceData.instanceId;

              // Add holdings to shared FOLIO instance in Member-1 (College)
              cy.setTenant(Affiliations.College);
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instanceData.instanceId,
                  permanentLocationId: testData.college.locationId,
                  sourceId: folioSource.id,
                }).then((holding) => {
                  testData.college.folioHoldingsId = holding.id;
                });
              });

              // Add holdings to shared FOLIO instance in Member-2 (University)
              cy.setTenant(Affiliations.University);
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: instanceData.instanceId,
                  permanentLocationId: testData.university.locationId,
                  sourceId: folioSource.id,
                }).then((holding) => {
                  testData.university.folioHoldingsId = holding.id;
                });
              });
            });

            // Create user with permissions
            cy.resetTenant();
            cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
              testData.user = userProperties;

              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

              cy.wait(120000); // Wait 2 minutes to ensure instances are "in the past" for OAI-PMH
            });
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        // Delete holdings and instances from College tenant (Member-1)
        cy.setTenant(Affiliations.College);
        if (testData.college.marcHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.college.marcHoldingsId);
        }
        if (testData.college.folioHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.college.folioHoldingsId);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Delete holdings from University tenant (Member-2)
        cy.setTenant(Affiliations.University);
        if (testData.university.marcHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.university.marcHoldingsId);
        }
        if (testData.university.folioHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.university.folioHoldingsId);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Delete shared instances from Central tenant
        cy.resetTenant();
        if (testData.marcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        }
        if (testData.folioInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.folioInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C422181 Consortia | SRS+Inventory | ListRecords | Suppressed with flag | Skip suppressed: Edit shared MARC and shared FOLIO instances (with associated Holdings) from Central tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C422181', 'nonParallel'] },
        () => {
          // Steps 1-2: Verify member-1 baseline - instances should NOT appear in current date responses
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listRecordsRequest('marc21', OaiPmhEdge.getApiKey(Affiliations.College)).then(
            (response) => {
              OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
              OaiPmh.verifyIdentifierInListResponse(response, testData.folioInstance.uuid, false);
            },
          );

          // Steps 3-4: Verify member-2 baseline - instances should NOT appear in current date responses
          cy.setTenant(Affiliations.University);
          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
            OaiPmh.verifyIdentifierInListResponse(response, testData.folioInstance.uuid, false);
          });

          // Steps 5-7: Edit shared MARC instance from Central tenant - suppress from discovery
          cy.resetTenant();
          cy.getUserToken(testData.user.username, testData.user.password);
          cy.setTenant(Affiliations.College);

          InventoryInstances.searchByTitle(testData.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.marcInstance.title);
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.clickDiscoverySuppressCheckbox();
          InstanceRecordEdit.saveAndClose();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery();
          InventorySearchAndFilter.resetAll();

          // Steps 8-10: Edit shared FOLIO instance from Central tenant - suppress from discovery
          InventoryInstances.searchByTitle(testData.folioInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.folioInstance.title);
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.clickDiscoverySuppressCheckbox();
          InstanceRecordEdit.saveAndClose();
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyInstanceIsMarkedAsSuppressedFromDiscovery();

          // Step 11: Member-1 ListRecords marc21 - verify both instances with 999 t=1
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listRecordsRequest('marc21', OaiPmhEdge.getApiKey(Affiliations.College)).then(
            (response) => {
              // Verify MARC instance
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
                { t: '1' },
              );

              // Verify FOLIO instance
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.uuid,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.uuid,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '1' },
              );
            },
          );

          // Step 12: Member-1 ListRecords marc21_withholdings - verify both with 999 t=1 and 952 t=1
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            // Verify MARC instance
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
              { t: '1' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );

            // Verify FOLIO instance
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.folioInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.folioInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.folioInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
          });

          // Step 13: Member-1 ListRecords oai_dc - verify both with dc:rights = "discovery suppressed"
          OaiPmhEdge.listRecordsRequest('oai_dc', OaiPmhEdge.getApiKey(Affiliations.College)).then(
            (response) => {
              // Verify MARC instance
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.marcInstance.uuid,
                false,
                false,
                Affiliations.College,
              );
              OaiPmh.verifyDublinCoreField(response, testData.marcInstance.uuid, {
                rights: 'discovery suppressed',
              });

              // Verify FOLIO instance
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.uuid,
                false,
                false,
                Affiliations.College,
              );
              OaiPmh.verifyDublinCoreField(response, testData.folioInstance.uuid, {
                rights: 'discovery suppressed',
              });
            },
          );

          // Step 14: Member-2 ListRecords marc21 - verify instances NOT present
          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
            OaiPmh.verifyIdentifierInListResponse(response, testData.folioInstance.uuid, false);
          });

          // Step 15: Member-2 ListRecords marc21_withholdings - verify instances NOT present
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
            OaiPmh.verifyIdentifierInListResponse(response, testData.folioInstance.uuid, false);
          });

          // Step 16: Member-2 ListRecords oai_dc - verify instances NOT present
          OaiPmhEdge.listRecordsRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
            OaiPmh.verifyIdentifierInListResponse(response, testData.folioInstance.uuid, false);
          });

          // Steps 17: Cross-tenant ListRecords marc21 - member-1 has them, member-2 doesn't
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          let resumptionTokenMarc21;

          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            // Extract resumption token for next page (University tenant)
            resumptionTokenMarc21 = OaiPmh.extractResumptionToken(response);

            // Step 18: Check member-1 response
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
              { t: '1' },
            );
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.folioInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.folioInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
          });

          // Second request with resumptionToken - verify member-2 records are NOT present
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.University);

            OaiPmhEdge.listRecordsRequestWithResumptionToken(
              resumptionTokenMarc21,
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              // Step 19: Check member-2 response - instances should NOT be present
              OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
              OaiPmh.verifyIdentifierInListResponse(response, testData.folioInstance.uuid, false);
            });
          });

          // Steps 20-22: Cross-tenant ListRecords marc21_withholdings
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);

            let resumptionTokenWithholdings;

            OaiPmhEdge.listRecordsRequest(
              'marc21_withholdings',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              // Extract resumption token for next page (University tenant)
              resumptionTokenWithholdings = OaiPmh.extractResumptionToken(response);

              // Step 21: Check member-1 response
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
                { t: '1' },
              );
              OaiPmh.verifyMarcField(
                response,
                testData.marcInstance.uuid,
                '952',
                { ind1: 'f', ind2: 'f' },
                { t: '1' },
              );
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.uuid,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.uuid,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '1' },
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.uuid,
                '952',
                { ind1: 'f', ind2: 'f' },
                { t: '1' },
              );

              // Second request with resumptionToken - verify member-2 records are NOT present
              cy.resetTenant();
              cy.getAdminToken();
              cy.setTenant(Affiliations.University);

              OaiPmhEdge.listRecordsRequestWithResumptionToken(
                resumptionTokenWithholdings,
                OaiPmhEdge.getApiKey(Affiliations.Consortia),
              ).then((responseUniversity) => {
                // Step 22: Check member-2 response - instances should NOT be present
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.marcInstance.uuid,
                  false,
                );
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.folioInstance.uuid,
                  false,
                );
              });
            });
          });

          // Steps 23-25: Cross-tenant ListRecords oai_dc
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);

            let resumptionTokenOaiDc;

            OaiPmhEdge.listRecordsRequest(
              'oai_dc',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              // Extract resumption token for next page (University tenant)
              resumptionTokenOaiDc = OaiPmh.extractResumptionToken(response);

              // Step 24: Check member-1 response
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.marcInstance.uuid,
                false,
                false,
                Affiliations.College,
              );
              OaiPmh.verifyDublinCoreField(response, testData.marcInstance.uuid, {
                rights: 'discovery suppressed',
              });
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.uuid,
                false,
                false,
                Affiliations.College,
              );
              OaiPmh.verifyDublinCoreField(response, testData.folioInstance.uuid, {
                rights: 'discovery suppressed',
              });

              // Second request with resumptionToken - verify member-2 records are NOT present
              cy.resetTenant();
              cy.getAdminToken();
              cy.setTenant(Affiliations.University);

              OaiPmhEdge.listRecordsRequestWithResumptionToken(
                resumptionTokenOaiDc,
                OaiPmhEdge.getApiKey(Affiliations.Consortia),
              ).then((responseUniversity) => {
                // Step 25: Check member-2 response - instances should NOT be present
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.marcInstance.uuid,
                  false,
                );
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.folioInstance.uuid,
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
