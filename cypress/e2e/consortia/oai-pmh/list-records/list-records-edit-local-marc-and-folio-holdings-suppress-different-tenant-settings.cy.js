import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
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

const userPermissions = [Permissions.inventoryAll.gui];

const testData = {
  user: {},
  college: {
    marcInstance: {
      title: `AT_C422191_LocalMarcInstance_College_${getRandomPostfix()}`,
      uuid: null,
    },
    folioInstance: {
      title: `AT_C422191_LocalFolioInstance_College_${getRandomPostfix()}`,
      uuid: null,
    },
    locationId: null,
    locationName: null,
    sourceId: null,
    marcHoldingsId: null,
    folioHoldingsId: null,
  },
  university: {
    marcInstance: {
      title: `AT_C422191_LocalMarcInstance_University_${getRandomPostfix()}`,
      uuid: null,
    },
    folioInstance: {
      title: `AT_C422191_LocalFolioInstance_University_${getRandomPostfix()}`,
      uuid: null,
    },
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

        const configureTenant = (tenant, tenantData, suppressedRecordsProcessing) => {
          cy.setTenant(tenant);
          Behavior.updateBehaviorConfigViaApi(
            suppressedRecordsProcessing,
            BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
          );
          InventoryInstances.getLocations({ limit: 1, query: 'name<>"DCB"' }).then((location) => {
            tenantData.locationId = location[0].id;
            if (tenantData.locationName !== undefined) {
              tenantData.locationName = location[0].name;
            }
          });
        };

        const createMarcInstanceWithHoldings = (tenantData) => {
          cy.createSimpleMarcBibViaAPI(tenantData.marcInstance.title).then((instanceId) => {
            tenantData.marcInstance.uuid = instanceId;

            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              tenantData.sourceId = folioSource.id;
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId,
                permanentLocationId: tenantData.locationId,
                sourceId: folioSource.id,
              }).then((holding) => {
                tenantData.marcHoldingsId = holding.id;
              });
            });
          });
        };

        const createFolioInstanceWithHoldings = (tenantData) => {
          InventoryInstance.createInstanceViaApi({
            instanceTitle: tenantData.folioInstance.title,
          }).then(({ instanceData }) => {
            tenantData.folioInstance.uuid = instanceData.instanceId;

            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: instanceData.instanceId,
                permanentLocationId: tenantData.locationId,
                sourceId: folioSource.id,
              }).then((holding) => {
                tenantData.folioHoldingsId = holding.id;
              });
            });
          });
        };

        cy.getAdminToken()
          .then(() => {
            // Configure OAI-PMH behavior for College tenant (Member-1) - Transfer suppressed with flag
            configureTenant(
              Affiliations.College,
              testData.college,
              BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
            );

            // Configure OAI-PMH behavior for University tenant (Member-2) - Skip suppressed
            configureTenant(
              Affiliations.University,
              testData.university,
              BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
            );
          })
          .then(() => {
            // Create local MARC and FOLIO instances in College tenant (Member-1)
            cy.setTenant(Affiliations.College);
            createMarcInstanceWithHoldings(testData.college);
            createFolioInstanceWithHoldings(testData.college);

            // Create local MARC and FOLIO instances in University tenant (Member-2)
            cy.setTenant(Affiliations.University);
            createMarcInstanceWithHoldings(testData.university);
            createFolioInstanceWithHoldings(testData.university);

            // Create user with permissions in all tenants
            cy.resetTenant();
            cy.createTempUser(userPermissions).then((userProperties) => {
              testData.user = userProperties;

              // Assign affiliations and permissions to College tenant (Member-1)
              cy.affiliateUserToTenant({
                tenantId: Affiliations.College,
                userId: testData.user.userId,
                permissions: userPermissions,
              });

              // Assign affiliations and permissions to University tenant (Member-2)
              cy.affiliateUserToTenant({
                tenantId: Affiliations.University,
                userId: testData.user.userId,
                permissions: userPermissions,
              });

              cy.resetTenant();
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

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
        if (testData.college.marcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.college.marcInstance.uuid);
        }
        if (testData.college.folioInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.college.folioInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Delete holdings and instances from University tenant (Member-2)
        cy.setTenant(Affiliations.University);
        if (testData.university.marcHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.university.marcHoldingsId);
        }
        if (testData.university.folioHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.university.folioHoldingsId);
        }
        if (testData.university.marcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.university.marcInstance.uuid);
        }
        if (testData.university.folioInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.university.folioInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();

        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C422191 Consortia | SRS+Inventory | ListRecords | Suppressed with flag | Skip suppressed: Edit Holdings of local MARC and local FOLIO instances from Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C422191', 'nonParallel'] },
        () => {
          const fromDate = DateTools.getCurrentDateForOaiPmh();

          // Steps 1-2: Verify member-1 baseline - local instances should NOT appear in current date responses
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.marcInstance.uuid,
              false,
            );
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.folioInstance.uuid,
              false,
            );
          });

          // Steps 3-4: Verify member-2 baseline - local instances should NOT appear in current date responses
          cy.setTenant(Affiliations.University);
          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.university.marcInstance.uuid,
              false,
            );
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.university.folioInstance.uuid,
              false,
            );
          });

          // Steps 5-7: Edit local MARC instance holdings in Member-1 tenant (College) - suppress from discovery
          cy.resetTenant();
          cy.getUserToken(testData.user.username, testData.user.password);
          cy.setTenant(Affiliations.College);

          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.college.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.college.marcInstance.title);
          InventoryInstance.openHoldingView();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.edit();
          HoldingsRecordEdit.waitLoading();
          HoldingsRecordEdit.markAsSuppressedFromDiscovery();
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.close();
          InventoryInstance.waitLoading();
          InventorySearchAndFilter.resetAll();

          // Steps 8-10: Edit local FOLIO instance holdings in Member-1 tenant (College) - suppress from discovery
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.college.folioInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.college.folioInstance.title);
          InventoryInstance.openHoldingView();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.edit();
          HoldingsRecordEdit.waitLoading();
          HoldingsRecordEdit.markAsSuppressedFromDiscovery();
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.close();
          InventoryInstance.waitLoading();

          // Step 11: Switch to member-2 tenant and repeat Steps 5-10
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);

          // Suppress holdings of local MARC instance in Member-2 tenant (University)
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.university.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.university.marcInstance.title);
          InventoryInstance.openHoldingView();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.edit();
          HoldingsRecordEdit.waitLoading();
          HoldingsRecordEdit.markAsSuppressedFromDiscovery();
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.close();
          InventoryInstance.waitLoading();
          InventorySearchAndFilter.resetAll();

          // Suppress holdings of local FOLIO instance in Member-2 tenant (University)
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.university.folioInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.university.folioInstance.title);
          InventoryInstance.openHoldingView();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.edit();
          HoldingsRecordEdit.waitLoading();
          HoldingsRecordEdit.markAsSuppressedFromDiscovery();
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.close();
          InventoryInstance.waitLoading();
          cy.wait(10000); // Wait for changes to propagate

          // Step 12: Member-1 ListRecords marc21 - verify both instances with 999 $t=0
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            // Verify MARC instance
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.college.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.college.marcInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );

            // Verify FOLIO instance
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.college.folioInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.college.folioInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );
          });

          // Step 13: Member-1 ListRecords marc21_withholdings - verify 999 $t=0 and 952 $t=1
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            // Verify MARC instance
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.college.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.college.marcInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.college.marcInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );

            // Verify FOLIO instance
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.college.folioInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.college.folioInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.college.folioInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
          });

          // Step 14: Member-1 ListRecords oai_dc - verify dc:rights = "discovery not suppressed"
          OaiPmhEdge.listRecordsRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            // Verify MARC instance
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.college.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyDublinCoreField(response, testData.college.marcInstance.uuid, {
              rights: 'discovery not suppressed',
            });

            // Verify FOLIO instance
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.college.folioInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyDublinCoreField(response, testData.college.folioInstance.uuid, {
              rights: 'discovery not suppressed',
            });
          });

          // Step 15: Member-2 ListRecords marc21 - verify both instances present
          cy.setTenant(Affiliations.University);
          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            // Verify MARC instance
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.university.marcInstance.uuid,
              false,
              true,
              Affiliations.University,
            );

            // Verify FOLIO instance
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.university.folioInstance.uuid,
              false,
              true,
              Affiliations.University,
            );
          });

          // Step 16: Member-2 ListRecords marc21_withholdings - verify holdings data NOT present
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            // Verify MARC instance - holdings data should NOT be present
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.university.marcInstance.uuid,
              false,
              true,
              Affiliations.University,
            );
            OaiPmh.verifyMarcFieldAbsent(response, testData.university.marcInstance.uuid, ['952']);

            // Verify FOLIO instance - holdings data should NOT be present
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.university.folioInstance.uuid,
              false,
              true,
              Affiliations.University,
            );
            OaiPmh.verifyMarcFieldAbsent(response, testData.university.folioInstance.uuid, ['952']);
          });

          // Step 17: Member-2 ListRecords oai_dc - verify both instances present
          OaiPmhEdge.listRecordsRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            // Verify MARC instance
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.university.marcInstance.uuid,
              false,
              true,
              Affiliations.University,
            );

            // Verify FOLIO instance
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.university.folioInstance.uuid,
              false,
              true,
              Affiliations.University,
            );
          });

          // Steps 18-20: Cross-tenant ListRecords marc21
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          let resumptionTokenMarc21;

          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            resumptionTokenMarc21 = OaiPmh.extractResumptionToken(response);

            // Step 19: Check member-1 response
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.college.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.college.marcInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.college.folioInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.college.folioInstance.uuid,
              '999',
              { ind1: 'f', ind2: 'f' },
              { t: '0' },
            );
          });

          // Second request with resumptionToken - verify member-2 records
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.University);

            OaiPmhEdge.listRecordsRequestWithResumptionToken(
              resumptionTokenMarc21,
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              // Step 20: Check member-2 response
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.university.marcInstance.uuid,
                false,
                true,
                Affiliations.University,
              );
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.university.folioInstance.uuid,
                false,
                true,
                Affiliations.University,
              );
            });
          });

          // Steps 21-23: Cross-tenant ListRecords marc21_withholdings
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);

            let resumptionTokenWithholdings;

            OaiPmhEdge.listRecordsRequest(
              'marc21_withholdings',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
              fromDate,
            ).then((response) => {
              resumptionTokenWithholdings = OaiPmh.extractResumptionToken(response);

              // Step 22: Check member-1 response - holdings data present with 952 $t=1
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.college.marcInstance.uuid,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyMarcField(
                response,
                testData.college.marcInstance.uuid,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
              OaiPmh.verifyMarcField(
                response,
                testData.college.marcInstance.uuid,
                '952',
                { ind1: 'f', ind2: 'f' },
                { t: '1' },
              );
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.college.folioInstance.uuid,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyMarcField(
                response,
                testData.college.folioInstance.uuid,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
              OaiPmh.verifyMarcField(
                response,
                testData.college.folioInstance.uuid,
                '952',
                { ind1: 'f', ind2: 'f' },
                { t: '1' },
              );

              // Second request with resumptionToken
              cy.resetTenant();
              cy.getAdminToken();
              cy.setTenant(Affiliations.University);

              OaiPmhEdge.listRecordsRequestWithResumptionToken(
                resumptionTokenWithholdings,
                OaiPmhEdge.getApiKey(Affiliations.Consortia),
              ).then((responseUniversity) => {
                // Step 23: Check member-2 response - holdings data NOT present
                OaiPmh.verifyOaiPmhRecordHeader(
                  responseUniversity,
                  testData.university.marcInstance.uuid,
                  false,
                  true,
                  Affiliations.University,
                );
                OaiPmh.verifyMarcFieldAbsent(
                  responseUniversity,
                  testData.university.marcInstance.uuid,
                  ['952'],
                );
                OaiPmh.verifyOaiPmhRecordHeader(
                  responseUniversity,
                  testData.university.folioInstance.uuid,
                  false,
                  true,
                  Affiliations.University,
                );
                OaiPmh.verifyMarcFieldAbsent(
                  responseUniversity,
                  testData.university.folioInstance.uuid,
                  ['952'],
                );
              });
            });
          });

          // Steps 24-26: Cross-tenant ListRecords oai_dc
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);

            let resumptionTokenOaiDc;

            OaiPmhEdge.listRecordsRequest(
              'oai_dc',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
              fromDate,
            ).then((response) => {
              resumptionTokenOaiDc = OaiPmh.extractResumptionToken(response);

              // Step 25: Check member-1 response
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.college.marcInstance.uuid,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyDublinCoreField(response, testData.college.marcInstance.uuid, {
                rights: 'discovery not suppressed',
              });
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.college.folioInstance.uuid,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyDublinCoreField(response, testData.college.folioInstance.uuid, {
                rights: 'discovery not suppressed',
              });

              // Second request with resumptionToken
              cy.resetTenant();
              cy.getAdminToken();
              cy.setTenant(Affiliations.University);

              OaiPmhEdge.listRecordsRequestWithResumptionToken(
                resumptionTokenOaiDc,
                OaiPmhEdge.getApiKey(Affiliations.Consortia),
              ).then((responseUniversity) => {
                // Step 26: Check member-2 response
                OaiPmh.verifyOaiPmhRecordHeader(
                  responseUniversity,
                  testData.university.marcInstance.uuid,
                  false,
                  true,
                  Affiliations.University,
                );
                OaiPmh.verifyOaiPmhRecordHeader(
                  responseUniversity,
                  testData.university.folioInstance.uuid,
                  false,
                  true,
                  Affiliations.University,
                );
              });
            });
          });
        },
      );
    });
  });
});
