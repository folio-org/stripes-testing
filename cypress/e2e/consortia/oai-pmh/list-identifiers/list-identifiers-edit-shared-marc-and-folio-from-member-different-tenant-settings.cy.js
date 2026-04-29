import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InstanceRecordEdit from '../../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

const userPermissions = [
  Permissions.inventoryAll.gui,
  Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
];

const testData = {
  user: {},
  marcInstance: {
    title: `AT_C422188_SharedMarcInstance_${getRandomPostfix()}`,
    uuid: null,
  },
  folioInstance: {
    title: `AT_C422188_SharedFolioInstance_${getRandomPostfix()}`,
    editedTitle: `AT_C422188_EditedFolioInstance_${getRandomPostfix()}`,
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
  marc245Field: {
    tag: '245',
    content: `$a AT_C422188_EditedMarcTitle_${getRandomPostfix()}`,
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
            // Create shared MARC instance in Central tenant
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

            // Create user with permissions in all tenants
            cy.resetTenant();
            cy.createTempUser(userPermissions).then((userProperties) => {
              testData.user = userProperties;

              // Assign affiliations and permissions to College tenant (Member-1)
              cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(testData.user.userId, userPermissions);

              // Assign affiliations and permissions to University tenant (Member-2)
              cy.resetTenant();
              cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(testData.user.userId, userPermissions);

              cy.resetTenant();
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              ConsortiumManager.switchActiveAffiliation(
                tenantNames.central,
                tenantNames.university,
              );

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
        'C422188 Consortia | SRS+Inventory | ListIdentifiers | Suppressed with flag | Skip suppressed: Edit shared MARC and shared FOLIO instances (with associated Holdings) from Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C422188', 'nonParallel'] },
        () => {
          // Steps 1-2: Verify member-1 baseline - instances should NOT appear in current date responses
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
            OaiPmh.verifyIdentifierInListResponse(response, testData.folioInstance.uuid, false);
          });

          // Steps 3-4: Verify member-2 baseline - instances should NOT appear in current date responses
          cy.setTenant(Affiliations.University);
          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
            OaiPmh.verifyIdentifierInListResponse(response, testData.folioInstance.uuid, false);
          });

          // Steps 5-7: Edit shared MARC instance from Member-2 tenant (University)
          cy.resetTenant();
          cy.getUserToken(testData.user.username, testData.user.password);
          cy.setTenant(Affiliations.University);

          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.marcInstance.title);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(
            testData.marc245Field.tag,
            testData.marc245Field.content,
          );
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.waitLoading();

          // Steps 8-10: Switch to member-1 tenant and edit shared FOLIO instance
          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.folioInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.folioInstance.title);
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.fillResourceTitle(testData.folioInstance.editedTitle);
          InstanceRecordEdit.saveAndClose();
          InventoryInstance.waitLoading();
          InventoryInstance.checkInstanceTitle(testData.folioInstance.editedTitle);

          // Step 11: Member-1 ListIdentifiers marc21 - verify both instances present
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
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 12: Member-1 ListIdentifiers marc21_withholdings - verify both instances present
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
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 13: Member-1 ListIdentifiers oai_dc - verify both instances present
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
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 14: Member-2 ListIdentifiers marc21 - verify both instances present
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.University);

          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
          });

          // Step 15: Member-2 ListIdentifiers marc21_withholdings - verify both instances present
          OaiPmhEdge.listIdentifiersRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
          });

          // Step 16: Member-2 ListIdentifiers oai_dc - verify both instances present
          OaiPmhEdge.listIdentifiersRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.University),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
          });

          // Steps 17-19: Cross-tenant ListIdentifiers marc21
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          let resumptionTokenMarc21;

          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            resumptionTokenMarc21 = OaiPmh.extractResumptionToken(response);

            // Step 18: Check member-1 response
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Second request with resumptionToken - verify member-2 records
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.University);

            OaiPmhEdge.listIdentifiersRequestWithResumptionToken(
              resumptionTokenMarc21,
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              // Step 19: Check member-2 response
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.marcInstance.uuid,
                true,
                false,
                Affiliations.University,
              );
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.uuid,
                true,
                false,
                Affiliations.University,
              );
            });
          });

          // Steps 20-22: Cross-tenant ListIdentifiers marc21_withholdings
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);

            let resumptionTokenWithholdings;

            OaiPmhEdge.listIdentifiersRequest(
              'marc21_withholdings',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              resumptionTokenWithholdings = OaiPmh.extractResumptionToken(response);

              // Step 21: Check member-1 response
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.marcInstance.uuid,
                true,
                false,
                Affiliations.College,
              );
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.uuid,
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
              ).then((responseUniversity) => {
                // Step 22: Check member-2 response
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.marcInstance.uuid,
                  true,
                  false,
                  Affiliations.University,
                );
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.folioInstance.uuid,
                  true,
                  false,
                  Affiliations.University,
                );
              });
            });
          });

          // Steps 23-25: Cross-tenant ListIdentifiers oai_dc
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);

            let resumptionTokenOaiDc;

            OaiPmhEdge.listIdentifiersRequest(
              'oai_dc',
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              resumptionTokenOaiDc = OaiPmh.extractResumptionToken(response);

              // Step 24: Check member-1 response
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.marcInstance.uuid,
                true,
                false,
                Affiliations.College,
              );
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.uuid,
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
              ).then((responseUniversity) => {
                // Step 25: Check member-2 response
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.marcInstance.uuid,
                  true,
                  false,
                  Affiliations.University,
                );
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.folioInstance.uuid,
                  true,
                  false,
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
