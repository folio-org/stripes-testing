import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';

const userPermissions = [Permissions.inventoryAll.gui];

const testData = {
  user: {},
  college: {
    marcInstance: {
      title: `AT_C422192_SharedMarcInstance_${getRandomPostfix()}`,
      uuid: null,
    },
    folioInstance: {
      title: `AT_C422192_SharedFolioInstance_${getRandomPostfix()}`,
      uuid: null,
    },
    locationId: null,
    marcHoldingsId: null,
    folioHoldingsId: null,
    marcHoldingsCallNumber: `CN_MARC_${getRandomPostfix()}`,
    folioHoldingsCallNumber: `CN_FOLIO_${getRandomPostfix()}`,
  },
  university: {
    locationId: null,
    marcHoldingsId: null,
    folioHoldingsId: null,
    marcHoldingsCallNumber: `CN_MARC_${getRandomPostfix()}`,
    folioHoldingsCallNumber: `CN_FOLIO_${getRandomPostfix()}`,
  },
};

describe('OAI-PMH', () => {
  describe('ListIdentifiers', () => {
    describe('Consortia', () => {
      // eslint-disable-next-line func-names
      before('Create test data', function () {
        if (!OaiPmhEdge.isEdgeConfigured()) {
          this.skip();
        }

        const createHoldingsForBothInstances = (tenantData) => {
          // Create holdings for shared MARC instance
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.college.marcInstance.uuid,
              permanentLocationId: tenantData.locationId,
              sourceId: folioSource.id,
            }).then((holding) => {
              tenantData.marcHoldingsId = holding.id;
            });
          });

          // Create holdings for shared FOLIO instance
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.college.folioInstance.uuid,
              permanentLocationId: tenantData.locationId,
              sourceId: folioSource.id,
            }).then((holding) => {
              tenantData.folioHoldingsId = holding.id;
            });
          });
        };

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
            // Create shared MARC instance in Central tenant (suppressed from discovery)
            cy.resetTenant();
            cy.createSimpleMarcBibViaAPI(testData.college.marcInstance.title).then((instanceId) => {
              testData.college.marcInstance.uuid = instanceId;

              // Suppress instance from discovery
              cy.getInstanceById(instanceId).then((instanceData) => {
                cy.updateInstance({
                  ...instanceData,
                  discoverySuppress: true,
                });
              });
            });

            // Create shared FOLIO instance in Central tenant (suppressed from discovery)
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: instanceTypes[0].id,
                  title: testData.college.folioInstance.title,
                  discoverySuppress: true,
                },
              }).then((createdInstanceData) => {
                testData.college.folioInstance.uuid = createdInstanceData.instanceId;
              });
            });
          })
          .then(() => {
            // Create holdings in College tenant (Member-1) for both instances
            cy.setTenant(Affiliations.College);
            createHoldingsForBothInstances(testData.college);

            // Create holdings in University tenant (Member-2) for both instances
            cy.setTenant(Affiliations.University);
            createHoldingsForBothInstances(testData.university);

            // Create user with permissions
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

        // Delete holdings from College tenant (Member-1)
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

        // Delete instances from Central tenant
        cy.resetTenant();
        if (testData.college.marcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.college.marcInstance.uuid);
        }
        if (testData.college.folioInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.college.folioInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C422192 Consortia | SRS+Inventory | ListIdentifiers | Suppressed with flag | Skip suppressed: Edit Holdings of shared MARC and shared FOLIO instances from Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C422192', 'nonParallel'] },
        () => {
          const fromDate = DateTools.getCurrentDateForOaiPmh();

          // Steps 1-2: Verify member-1 baseline - shared instances should NOT appear in current date responses
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listIdentifiersRequest(
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

          // Steps 3-4: Verify member-2 baseline - shared instances should NOT appear in current date responses
          cy.setTenant(Affiliations.University);
          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.University),
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

          // Steps 5-7: Edit shared MARC instance holdings in Member-1 tenant (College)
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
          HoldingsRecordEdit.fillCallNumber(testData.college.marcHoldingsCallNumber);
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.close();
          InventoryInstance.waitLoading();
          InventorySearchAndFilter.resetAll();

          // Steps 8-10: Edit shared FOLIO instance holdings in Member-1 tenant (College)
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.college.folioInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.college.folioInstance.title);
          InventoryInstance.openHoldingView();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.edit();
          HoldingsRecordEdit.waitLoading();
          HoldingsRecordEdit.fillCallNumber(testData.college.folioHoldingsCallNumber);
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.close();
          InventoryInstance.waitLoading();

          // Step 11: Switch to member-2 tenant and repeat Steps 5-10
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);

          // Edit holdings of shared MARC instance in Member-2 tenant (University)
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.college.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.college.marcInstance.title);
          InventoryInstance.openHoldingView();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.edit();
          HoldingsRecordEdit.waitLoading();
          HoldingsRecordEdit.fillCallNumber(testData.university.marcHoldingsCallNumber);
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.close();
          InventoryInstance.waitLoading();
          InventorySearchAndFilter.resetAll();

          // Edit holdings of shared FOLIO instance in Member-2 tenant (University)
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.college.folioInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.college.folioInstance.title);
          InventoryInstance.openHoldingView();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.edit();
          HoldingsRecordEdit.waitLoading();
          HoldingsRecordEdit.fillCallNumber(testData.university.folioHoldingsCallNumber);
          HoldingsRecordEdit.saveAndClose();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.close();
          InventoryInstance.waitLoading();
          cy.wait(10000); // Wait for changes to propagate

          // Step 12: Member-1 ListIdentifiers marc21 - verify both instances present
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            // Verify MARC instance
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );

            // Verify FOLIO instance
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.folioInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 13: Member-1 ListIdentifiers marc21_withholdings - verify both instances present
          OaiPmhEdge.listIdentifiersRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            // Verify MARC instance
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );

            // Verify FOLIO instance
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.folioInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 14: Member-1 ListIdentifiers oai_dc - verify both instances present
          OaiPmhEdge.listIdentifiersRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            // Verify MARC instance
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );

            // Verify FOLIO instance
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.folioInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 15: Member-2 ListIdentifiers marc21 - verify both instances NOT present (skipped)
          cy.setTenant(Affiliations.University);
          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            // Verify MARC instance NOT present
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.marcInstance.uuid,
              false,
            );

            // Verify FOLIO instance NOT present
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.folioInstance.uuid,
              false,
            );
          });

          // Step 16: Member-2 ListIdentifiers marc21_withholdings - verify both instances NOT present
          OaiPmhEdge.listIdentifiersRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            // Verify MARC instance NOT present
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.marcInstance.uuid,
              false,
            );

            // Verify FOLIO instance NOT present
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.folioInstance.uuid,
              false,
            );
          });

          // Step 17: Member-2 ListIdentifiers oai_dc - verify both instances NOT present
          OaiPmhEdge.listIdentifiersRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            // Verify MARC instance NOT present
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.marcInstance.uuid,
              false,
            );

            // Verify FOLIO instance NOT present
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.folioInstance.uuid,
              false,
            );
          });

          // Steps 18-20: Cross-tenant ListIdentifiers marc21
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          let resumptionTokenMarc21;

          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            resumptionTokenMarc21 = OaiPmh.extractResumptionToken(response);

            // Step 19: Check member-1 response - instances PRESENT
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.college.folioInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Second request with resumptionToken - verify member-2 records NOT present
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.University);

            OaiPmhEdge.listIdentifiersRequestWithResumptionToken(
              resumptionTokenMarc21,
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
              fromDate,
            ).then((response) => {
              // Step 20: Check member-2 response - instances NOT present (skipped)
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
          });

          // Steps 21-23: Cross-tenant ListIdentifiers marc21_withholdings
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);

            let resumptionTokenWithholdings;

            OaiPmhEdge.listIdentifiersRequest(
              'marc21_withholdings',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
              fromDate,
            ).then((response) => {
              resumptionTokenWithholdings = OaiPmh.extractResumptionToken(response);

              // Step 22: Check member-1 response - instances PRESENT
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.college.marcInstance.uuid,
                true,
                false,
                Affiliations.College,
              );
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.college.folioInstance.uuid,
                true,
                false,
                Affiliations.College,
              );

              // Second request with resumptionToken
              cy.resetTenant();
              cy.getAdminToken();
              cy.setTenant(Affiliations.University);

              OaiPmhEdge.listIdentifiersRequestWithResumptionToken(
                resumptionTokenWithholdings,
                OaiPmhEdge.getApiKey(Affiliations.Consortia),
                fromDate,
              ).then((responseUniversity) => {
                // Step 23: Check member-2 response - instances NOT present
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.college.marcInstance.uuid,
                  false,
                );
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.college.folioInstance.uuid,
                  false,
                );
              });
            });
          });

          // Steps 24-26: Cross-tenant ListIdentifiers oai_dc
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);

            let resumptionTokenOaiDc;

            OaiPmhEdge.listIdentifiersRequest(
              'oai_dc',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
              fromDate,
            ).then((response) => {
              resumptionTokenOaiDc = OaiPmh.extractResumptionToken(response);

              // Step 25: Check member-1 response - instances PRESENT
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.college.marcInstance.uuid,
                true,
                false,
                Affiliations.College,
              );
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.college.folioInstance.uuid,
                true,
                false,
                Affiliations.College,
              );

              // Second request with resumptionToken
              cy.resetTenant();
              cy.getAdminToken();
              cy.setTenant(Affiliations.University);

              OaiPmhEdge.listIdentifiersRequestWithResumptionToken(
                resumptionTokenOaiDc,
                OaiPmhEdge.getApiKey(Affiliations.Consortia),
                fromDate,
              ).then((responseUniversity) => {
                // Step 26: Check member-2 response - instances NOT present
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.college.marcInstance.uuid,
                  false,
                );
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.college.folioInstance.uuid,
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
