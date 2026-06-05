import { APPLICATION_NAMES, ITEM_STATUS_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../../support/fragments/inventory/item/itemRecordEdit';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  user: {},
  college: {
    marcInstance: {
      title: `AT_C422197_LocalMarcInstance_College_${getRandomPostfix()}`,
      uuid: null,
    },
    folioInstance: {
      title: `AT_C422197_LocalFolioInstance_College_${getRandomPostfix()}`,
      uuid: null,
    },
    locationId: null,
    locationName: null,
    sourceId: null,
    marcHoldingsId: null,
    marcItemId: null,
    marcItemBarcode: `MarcItemCollege_${getRandomPostfix()}`,
    folioHoldingsId: null,
    folioItemId: null,
    folioItemBarcode: `FolioItemCollege_${getRandomPostfix()}`,
  },
  university: {
    marcInstance: {
      title: `AT_C422197_LocalMarcInstance_University_${getRandomPostfix()}`,
      uuid: null,
    },
    folioInstance: {
      title: `AT_C422197_LocalFolioInstance_University_${getRandomPostfix()}`,
      uuid: null,
    },
    locationId: null,
    sourceId: null,
    marcHoldingsId: null,
    marcItemId: null,
    marcItemBarcode: `MarcItemUniversity_${getRandomPostfix()}`,
    folioHoldingsId: null,
    folioItemId: null,
    folioItemBarcode: `FolioItemUniversity_${getRandomPostfix()}`,
  },
  materialTypeId: null,
  loanTypeId: null,
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

        // Configure OAI-PMH behavior and setup for both member tenants
        [
          {
            affiliation: Affiliations.College,
            tenantData: testData.college,
            suppressedProcessing: BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          },
          {
            affiliation: Affiliations.University,
            tenantData: testData.university,
            suppressedProcessing: BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
          },
        ].forEach(({ affiliation, tenantData, suppressedProcessing }) => {
          cy.setTenant(affiliation);

          // Get material type and loan type from tenant
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            testData.materialTypeId = res.id;
          });

          Behavior.updateBehaviorConfigViaApi(
            suppressedProcessing,
            BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
          );
          InventoryInstances.getLocations({ limit: 1, query: 'name<>"DCB"' }).then((location) => {
            tenantData.locationId = location[0].id;
            tenantData.locationName = location[0].name;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            tenantData.sourceId = folioSource.id;
          });
        });

        // Create local instances (MARC and FOLIO) in both member tenants
        [
          { affiliation: Affiliations.College, tenantData: testData.college },
          { affiliation: Affiliations.University, tenantData: testData.university },
        ].forEach(({ affiliation, tenantData }) => {
          cy.setTenant(affiliation);

          // Create local MARC instance
          cy.createSimpleMarcBibViaAPI(tenantData.marcInstance.title).then((instanceId) => {
            tenantData.marcInstance.uuid = instanceId;

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId,
              permanentLocationId: tenantData.locationId,
              sourceId: tenantData.sourceId,
            }).then((holdingsData) => {
              tenantData.marcHoldingsId = holdingsData.id;

              cy.getLoanTypes({ limit: 1 }).then((res) => {
                testData.loanTypeId = res[0].id;

                InventoryItems.createItemViaApi({
                  barcode: tenantData.marcItemBarcode,
                  holdingsRecordId: tenantData.marcHoldingsId,
                  materialType: { id: testData.materialTypeId },
                  permanentLoanType: { id: testData.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  tenantData.marcItemId = item.id;
                });
              });
            });
          });

          // Create local FOLIO instance
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: instanceTypes[0].id,
                title: tenantData.folioInstance.title,
              },
            }).then((createdInstanceData) => {
              tenantData.folioInstance.uuid = createdInstanceData.instanceId;

              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: tenantData.folioInstance.uuid,
                permanentLocationId: tenantData.locationId,
                sourceId: tenantData.sourceId,
              }).then((holdingsData) => {
                tenantData.folioHoldingsId = holdingsData.id;

                InventoryItems.createItemViaApi({
                  barcode: tenantData.folioItemBarcode,
                  holdingsRecordId: tenantData.folioHoldingsId,
                  materialType: { id: testData.materialTypeId },
                  permanentLoanType: { id: testData.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                }).then((item) => {
                  tenantData.folioItemId = item.id;
                });
              });
            });
          });
        });

        // Create user with permissions in Central, College, and University tenants
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
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          cy.wait(120_000); // Wait for 2 minutes to ensure instances are created "in the past"
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        // Delete tenant data for both College and University
        [
          { affiliation: Affiliations.College, tenantData: testData.college },
          { affiliation: Affiliations.University, tenantData: testData.university },
        ].forEach(({ affiliation, tenantData }) => {
          cy.setTenant(affiliation);
          if (tenantData.marcItemId) {
            cy.deleteItemViaApi(tenantData.marcItemId);
          }
          if (tenantData.marcHoldingsId) {
            cy.deleteHoldingRecordViaApi(tenantData.marcHoldingsId);
          }
          if (tenantData.folioItemId) {
            cy.deleteItemViaApi(tenantData.folioItemId);
          }
          if (tenantData.folioHoldingsId) {
            cy.deleteHoldingRecordViaApi(tenantData.folioHoldingsId);
          }
          if (tenantData.marcInstance.uuid) {
            InventoryInstance.deleteInstanceViaApi(tenantData.marcInstance.uuid);
          }
          if (tenantData.folioInstance.uuid) {
            InventoryInstance.deleteInstanceViaApi(tenantData.folioInstance.uuid);
          }
          Behavior.updateBehaviorConfigViaApi();
        });

        cy.resetTenant();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C422197 Consortia | SRS+Inventory | ListIdentifiers | Suppressed with flag | Skip suppressed: Edit Item of local MARC and local FOLIO instances from Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C422197', 'nonParallel'] },
        () => {
          const fromDate = DateTools.getCurrentDateForOaiPmh();

          // Step 1-2: Member-1 ListIdentifiers marc21 - verify instances NOT in response before editing
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

          // Step 3-4: Member-2 ListIdentifiers marc21 - verify instances NOT in response before editing
          OaiPmhEdge.listIdentifiersRequest(
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

          // Step 5-7: Member-1 - Edit Item of local MARC instance (add copy number)
          cy.resetTenant();
          cy.getUserToken(testData.user.username, testData.user.password);
          cy.setTenant(Affiliations.College);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.college.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.college.marcInstance.title);
          InventoryInstance.openHoldingsAccordion(testData.college.locationName);
          InventoryInstance.openItemByBarcode(testData.college.marcItemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.openItemEditForm(testData.college.marcInstance.title);
          ItemRecordEdit.fillItemRecordFields({ copyNumber: getRandomPostfix() });
          ItemRecordEdit.saveAndClose();
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.resetAll();

          // Step 8-10: Member-1 - Edit Item of local FOLIO instance (add copy number)
          InventoryInstances.searchByTitle(testData.college.folioInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.college.folioInstance.title);
          InventoryInstance.openHoldingsAccordion(testData.college.locationName);
          InventoryInstance.openItemByBarcode(testData.college.folioItemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.openItemEditForm(testData.college.folioInstance.title);
          ItemRecordEdit.fillItemRecordFields({ copyNumber: getRandomPostfix() });
          ItemRecordEdit.saveAndClose();
          ItemRecordView.closeDetailView();

          // Step 11: Member-2 - Switch affiliation and edit items
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          InventoryInstances.waitContentLoading();

          // Edit MARC item in University tenant
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.university.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.university.marcInstance.title);
          InventoryInstance.openHoldingsAccordion(testData.university.locationName);
          InventoryInstance.openItemByBarcode(testData.university.marcItemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.openItemEditForm(testData.university.marcInstance.title);
          ItemRecordEdit.fillItemRecordFields({ copyNumber: getRandomPostfix() });
          ItemRecordEdit.saveAndClose();
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.resetAll();

          // Edit FOLIO item in University tenant
          InventoryInstances.searchByTitle(testData.university.folioInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.university.folioInstance.title);
          InventoryInstance.openHoldingsAccordion(testData.university.locationName);
          InventoryInstance.openItemByBarcode(testData.university.folioItemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.openItemEditForm(testData.university.folioInstance.title);
          ItemRecordEdit.fillItemRecordFields({ copyNumber: getRandomPostfix() });
          ItemRecordEdit.saveAndClose();
          ItemRecordView.closeDetailView();
          cy.wait(10_000); // Wait for changes to propagate

          // Step 12-14: Member-1 Single-tenant ListIdentifiers requests
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          // Step 12: ListIdentifiers marc21
          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
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

          // Step 13: ListIdentifiers marc21_withholdings
          OaiPmhEdge.listIdentifiersRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
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

          // Step 14: ListIdentifiers oai_dc
          OaiPmhEdge.listIdentifiersRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
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

          // Step 15-17: Member-2 Single-tenant ListIdentifiers requests
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.University);

          // Step 15: ListIdentifiers marc21
          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.university.marcInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.university.folioInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
          });

          // Step 16: ListIdentifiers marc21_withholdings
          OaiPmhEdge.listIdentifiersRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.university.marcInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.university.folioInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
          });

          // Step 17: ListIdentifiers oai_dc
          OaiPmhEdge.listIdentifiersRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.university.marcInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.university.folioInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
          });

          // Step 18-26: Cross-tenant ListIdentifiers requests
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          // Steps 18-20: Cross-tenant ListIdentifiers marc21
          let resumptionTokenMarc21;

          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            // Extract resumption token for Member-2
            resumptionTokenMarc21 = OaiPmh.extractResumptionToken(response);

            // Step 19: Verify Member-1 instances
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

          // Step 20: Cross-tenant marc21 - Member-2 (using resumption token)
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.University);

            OaiPmhEdge.listIdentifiersRequestWithResumptionToken(
              resumptionTokenMarc21,
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              // Verify Member-2 instances
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.university.marcInstance.uuid,
                true,
                false,
                Affiliations.University,
              );
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.university.folioInstance.uuid,
                true,
                false,
                Affiliations.University,
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
              // Extract resumption token for Member-2
              resumptionTokenWithholdings = OaiPmh.extractResumptionToken(response);

              // Step 22: Verify Member-1 instances
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

              // Step 23: Cross-tenant marc21_withholdings - Member-2 (using resumption token)
              cy.resetTenant();
              cy.getAdminToken();
              cy.setTenant(Affiliations.University);

              OaiPmhEdge.listIdentifiersRequestWithResumptionToken(
                resumptionTokenWithholdings,
                OaiPmhEdge.getApiKey(Affiliations.Consortia),
              ).then((responseUniversity) => {
                // Verify Member-2 instances
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.university.marcInstance.uuid,
                  true,
                  false,
                  Affiliations.University,
                );
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.university.folioInstance.uuid,
                  true,
                  false,
                  Affiliations.University,
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
              // Extract resumption token for Member-2
              resumptionTokenOaiDc = OaiPmh.extractResumptionToken(response);

              // Step 25: Verify Member-1 instances
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

              // Step 26: Cross-tenant oai_dc - Member-2 (using resumption token)
              cy.resetTenant();
              cy.getAdminToken();
              cy.setTenant(Affiliations.University);

              OaiPmhEdge.listIdentifiersRequestWithResumptionToken(
                resumptionTokenOaiDc,
                OaiPmhEdge.getApiKey(Affiliations.Consortia),
              ).then((responseUniversity) => {
                // Verify Member-2 instances
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.university.marcInstance.uuid,
                  true,
                  false,
                  Affiliations.University,
                );
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.university.folioInstance.uuid,
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
