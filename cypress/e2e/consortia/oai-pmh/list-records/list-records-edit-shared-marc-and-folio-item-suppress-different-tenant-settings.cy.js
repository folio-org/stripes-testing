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
  marcInstance: {
    title: `AT_C422193_SharedMarcInstance_${getRandomPostfix()}`,
    uuid: null,
    hrid: null,
  },
  folioInstance: {
    title: `AT_C422193_SharedFolioInstance_${getRandomPostfix()}`,
    uuid: null,
  },
  college: {
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
    locationId: null,
    locationName: null,
    sourceId: null,
    marcHoldingsId: null,
    marcItemId: null,
    marcItemBarcode: `MarcItemUniversity_${getRandomPostfix()}`,
    folioHoldingsId: null,
    folioItemId: null,
    folioItemBarcode: `FolioItemUniversity_${getRandomPostfix()}`,
  },
  materialTypeId: null,
  loanTypeIdCollege: null,
  loanTypeIdUniversity: null,
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

        // Configure OAI-PMH behavior for College tenant: Transfer suppressed with flag
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        );
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.college.locationName = locations[0].name;
          testData.college.locationId = locations[0].id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.college.sourceId = folioSource.id;
        });

        // Get material type and loan type IDs
        cy.getMaterialTypes({ limit: 1 }).then((res) => {
          testData.materialTypeId = res.id;
        });
        cy.getLoanTypes({ limit: 1 }).then((res) => {
          testData.loanTypeIdCollege = res[0].id;
        });

        // Configure OAI-PMH behavior for University tenant: Skip suppressed records
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        );
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.university.locationName = locations[0].name;
          testData.university.locationId = locations[0].id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.university.sourceId = folioSource.id;
        });

        cy.resetTenant();

        // Create shared MARC instance in Central tenant
        cy.createSimpleMarcBibViaAPI(testData.marcInstance.title).then((instanceId) => {
          testData.marcInstance.uuid = instanceId;

          cy.getInstanceById(instanceId).then((instanceData) => {
            testData.marcInstance.hrid = instanceData.hrid;
          });

          // Create holdings and items for MARC instance in College tenant
          cy.setTenant(Affiliations.College);
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId: testData.marcInstance.uuid,
            permanentLocationId: testData.college.locationId,
            sourceId: testData.college.sourceId,
          }).then((holdingsData) => {
            testData.college.marcHoldingsId = holdingsData.id;

            InventoryItems.createItemViaApi({
              barcode: testData.college.marcItemBarcode,
              holdingsRecordId: testData.college.marcHoldingsId,
              materialType: { id: testData.materialTypeId },
              permanentLoanType: { id: testData.loanTypeIdCollege },
              status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            }).then((item) => {
              testData.college.marcItemId = item.id;
            });
          });

          // Create holdings and items for MARC instance in University tenant
          cy.setTenant(Affiliations.University);
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeIdUniversity = res[0].id;

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.marcInstance.uuid,
              permanentLocationId: testData.university.locationId,
              sourceId: testData.university.sourceId,
            }).then((holdingsData) => {
              testData.university.marcHoldingsId = holdingsData.id;

              InventoryItems.createItemViaApi({
                barcode: testData.university.marcItemBarcode,
                holdingsRecordId: testData.university.marcHoldingsId,
                materialType: { id: testData.materialTypeId },
                permanentLoanType: { id: testData.loanTypeIdUniversity },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                testData.university.marcItemId = item.id;
              });
            });
          });
        });

        cy.resetTenant();

        // Create shared FOLIO instance in Central tenant
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: testData.folioInstance.title,
            },
          }).then((createdInstanceData) => {
            testData.folioInstance.uuid = createdInstanceData.instanceId;

            // Create holdings and items for FOLIO instance in College tenant
            cy.setTenant(Affiliations.College);
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.folioInstance.uuid,
              permanentLocationId: testData.college.locationId,
              sourceId: testData.college.sourceId,
            }).then((holdingsData) => {
              testData.college.folioHoldingsId = holdingsData.id;

              InventoryItems.createItemViaApi({
                barcode: testData.college.folioItemBarcode,
                holdingsRecordId: testData.college.folioHoldingsId,
                materialType: { id: testData.materialTypeId },
                permanentLoanType: { id: testData.loanTypeIdCollege },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                testData.college.folioItemId = item.id;
              });
            });

            // Create holdings and items for FOLIO instance in University tenant
            cy.setTenant(Affiliations.University);
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.folioInstance.uuid,
              permanentLocationId: testData.university.locationId,
              sourceId: testData.university.sourceId,
            }).then((holdingsData) => {
              testData.university.folioHoldingsId = holdingsData.id;

              InventoryItems.createItemViaApi({
                barcode: testData.university.folioItemBarcode,
                holdingsRecordId: testData.university.folioHoldingsId,
                materialType: { id: testData.materialTypeId },
                permanentLoanType: { id: testData.loanTypeIdUniversity },
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
              }).then((item) => {
                testData.university.folioItemId = item.id;
              });
            });
          });
        });

        // Create user with permissions in Central, College, and University tenants
        cy.resetTenant();
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;
          // Note: User is created in Central tenant by default with cy.createTempUser()

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

        // Delete College tenant data
        cy.setTenant(Affiliations.College);
        if (testData.college.marcItemId) {
          cy.deleteItemViaApi(testData.college.marcItemId);
        }
        if (testData.college.marcHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.college.marcHoldingsId);
        }
        if (testData.college.folioItemId) {
          cy.deleteItemViaApi(testData.college.folioItemId);
        }
        if (testData.college.folioHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.college.folioHoldingsId);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Delete University tenant data
        cy.setTenant(Affiliations.University);
        if (testData.university.marcItemId) {
          cy.deleteItemViaApi(testData.university.marcItemId);
        }
        if (testData.university.marcHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.university.marcHoldingsId);
        }
        if (testData.university.folioItemId) {
          cy.deleteItemViaApi(testData.university.folioItemId);
        }
        if (testData.university.folioHoldingsId) {
          cy.deleteHoldingRecordViaApi(testData.university.folioHoldingsId);
        }
        Behavior.updateBehaviorConfigViaApi();

        // Delete instances from Central tenant
        cy.resetTenant();
        if (testData.marcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        }
        if (testData.folioInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.folioInstance.uuid);
        }
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C422193 Consortia | SRS+Inventory | ListRecords | Suppressed with flag | Skip suppressed: Edit Item of shared MARC and shared FOLIO instances from Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C422193', 'nonParallel'] },
        () => {
          const fromDate = DateTools.getCurrentDateForOaiPmh();

          // Step 1-2: Member-1 ListRecords marc21 - verify instances NOT in response before editing
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
            OaiPmh.verifyIdentifierInListResponse(response, testData.folioInstance.uuid, false);
          });

          // Step 3-4: Member-2 ListRecords marc21 - verify instances NOT in response before editing
          cy.setTenant(Affiliations.University);

          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
            OaiPmh.verifyIdentifierInListResponse(response, testData.folioInstance.uuid, false);
          });

          // Step 5-7: Member-1 - Edit Item of shared MARC instance to suppress from discovery
          cy.resetTenant();
          cy.getUserToken(testData.user.username, testData.user.password);
          cy.setTenant(Affiliations.College);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.marcInstance.title);
          InventoryInstance.openHoldingsAccordion(testData.college.locationName);
          InventoryInstance.openItemByBarcode(testData.college.marcItemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.openItemEditForm(testData.marcInstance.title);
          ItemRecordEdit.markAsSuppressedFromDiscovery();
          ItemRecordEdit.saveAndClose();
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.resetAll();

          // Step 8-10: Member-1 - Edit Item of shared FOLIO instance to suppress from discovery
          InventoryInstances.searchByTitle(testData.folioInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.folioInstance.title);
          InventoryInstance.openHoldingsAccordion(testData.college.locationName);
          InventoryInstance.openItemByBarcode(testData.college.folioItemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.openItemEditForm(testData.folioInstance.title);
          ItemRecordEdit.markAsSuppressedFromDiscovery();
          ItemRecordEdit.saveAndClose();
          ItemRecordView.closeDetailView();

          // Step 11: Member-2 - Switch affiliation and edit items
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          InventoryInstances.waitContentLoading();

          // Edit MARC item in University tenant
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.marcInstance.title);
          InventoryInstance.openHoldingsAccordion(testData.university.locationName);
          InventoryInstance.openItemByBarcode(testData.university.marcItemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.waitLoading();
          ItemRecordView.openItemEditForm(testData.marcInstance.title);
          ItemRecordEdit.markAsSuppressedFromDiscovery();
          ItemRecordEdit.saveAndClose();
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.resetAll();

          // Edit FOLIO item in University tenant
          InventoryInstances.searchByTitle(testData.folioInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.folioInstance.title);
          InventoryInstance.openHoldingsAccordion(testData.university.locationName);
          InventoryInstance.openItemByBarcode(testData.university.folioItemBarcode);
          ItemRecordView.waitLoading();
          ItemRecordView.openItemEditForm(testData.folioInstance.title);
          ItemRecordEdit.markAsSuppressedFromDiscovery();
          ItemRecordEdit.saveAndClose();
          ItemRecordView.closeDetailView();
          cy.wait(10_000); // Wait for changes to propagate

          // Step 12: Member-1 Single-tenant ListRecords marc21
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            // Verify MARC instance with t=0
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

            // Verify FOLIO instance with t=0
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
              { t: '0' },
            );
          });

          // Step 13: Member-1 Single-tenant ListRecords marc21_withholdings
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            // Verify MARC instance with t=0 and item with t=1
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
              { t: '1' },
            );

            // Verify FOLIO instance with t=0 and item with t=1
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
              { t: '0' },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.folioInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { t: '1' },
            );
          });

          // Step 14: Member-1 Single-tenant ListRecords oai_dc
          OaiPmhEdge.listRecordsRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.College),
            fromDate,
          ).then((response) => {
            // Verify MARC instance with discovery not suppressed
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyDublinCoreField(response, testData.marcInstance.uuid, {
              rights: 'discovery not suppressed',
            });

            // Verify FOLIO instance with discovery not suppressed
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.folioInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyDublinCoreField(response, testData.folioInstance.uuid, {
              rights: 'discovery not suppressed',
            });
          });

          // Step 15: Member-2 Single-tenant ListRecords marc21 (skip suppressed - no item data)
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.University);

          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            // Verify MARC instance present
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.University,
            );

            // Verify FOLIO instance present
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
          });

          // Step 16: Member-2 Single-tenant ListRecords marc21_withholdings (no item data)
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            // Verify MARC instance - Holdings present but NO items
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.University,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { s: testData.university.locationName },
              ['m', 'p'],
            );

            // Verify FOLIO instance - Holdings present but NO items
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.folioInstance.uuid,
              false,
              true,
              Affiliations.University,
            );
            OaiPmh.verifyMarcField(
              response,
              testData.folioInstance.uuid,
              '952',
              { ind1: 'f', ind2: 'f' },
              { s: testData.university.locationName },
              ['m', 'p'],
            );
          });

          // Step 17: Member-2 Single-tenant ListRecords oai_dc
          OaiPmhEdge.listRecordsRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.University),
            fromDate,
          ).then((response) => {
            // Verify MARC instance present
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.University,
            );

            // Verify FOLIO instance present
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.folioInstance.uuid,
              true,
              false,
              Affiliations.University,
            );
          });

          // Step 18-19: Cross-tenant ListRecords marc21 - Member-1
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          let resumptionTokenMarc21;

          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
            fromDate,
          ).then((response) => {
            // Extract resumption token for Member-2
            resumptionTokenMarc21 = OaiPmh.extractResumptionToken(response);

            // Verify MARC instance with t=0
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

            // Verify FOLIO instance with t=0
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
              { t: '0' },
            );
          });

          // Step 20: Cross-tenant ListRecords marc21 - Member-2 (using resumption token)
          cy.then(() => {
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.University);

            OaiPmhEdge.listRecordsRequestWithResumptionToken(
              resumptionTokenMarc21,
              OaiPmhEdge.getApiKey(Affiliations.Consortia),
            ).then((response) => {
              // Verify MARC instance present
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.marcInstance.uuid,
                true,
                false,
                Affiliations.University,
              );

              // Verify FOLIO instance present
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.uuid,
                true,
                false,
                Affiliations.University,
              );
            });
          });

          // Step 21-22: Cross-tenant ListRecords marc21_withholdings - Member-1
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
              // Extract resumption token for Member-2
              resumptionTokenWithholdings = OaiPmh.extractResumptionToken(response);

              // Verify MARC instance with t=0 and item with t=1
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
                { t: '1', m: testData.college.marcItemBarcode },
              );

              // Verify FOLIO instance with t=0 and item with t=1
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
                { t: '0' },
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.uuid,
                '952',
                { ind1: 'f', ind2: 'f' },
                { t: '1', m: testData.college.folioItemBarcode },
              );

              // Step 23: Cross-tenant ListRecords marc21_withholdings - Member-2 (using resumption token)
              cy.resetTenant();
              cy.getAdminToken();
              cy.setTenant(Affiliations.University);

              OaiPmhEdge.listRecordsRequestWithResumptionToken(
                resumptionTokenWithholdings,
                OaiPmhEdge.getApiKey(Affiliations.Consortia),
              ).then((responseUniversity) => {
                // Verify MARC instance - Holdings present but NO items
                OaiPmh.verifyOaiPmhRecordHeader(
                  responseUniversity,
                  testData.marcInstance.uuid,
                  false,
                  true,
                  Affiliations.University,
                );
                OaiPmh.verifyMarcField(
                  responseUniversity,
                  testData.marcInstance.uuid,
                  '952',
                  { ind1: 'f', ind2: 'f' },
                  { s: testData.university.locationName },
                  ['m', 'p'],
                );

                // Verify FOLIO instance - Holdings present but NO items
                OaiPmh.verifyOaiPmhRecordHeader(
                  responseUniversity,
                  testData.folioInstance.uuid,
                  false,
                  true,
                  Affiliations.University,
                );
                OaiPmh.verifyMarcField(
                  responseUniversity,
                  testData.folioInstance.uuid,
                  '952',
                  { ind1: 'f', ind2: 'f' },
                  { s: testData.university.locationName },
                  ['m', 'p'],
                );
              });
            });
          });

          // Step 24-25: Cross-tenant ListRecords oai_dc - Member-1
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
              // Extract resumption token for Member-2
              resumptionTokenOaiDc = OaiPmh.extractResumptionToken(response);

              // Verify MARC instance with discovery not suppressed
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.marcInstance.uuid,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyDublinCoreField(response, testData.marcInstance.uuid, {
                rights: 'discovery not suppressed',
              });

              // Verify FOLIO instance with discovery not suppressed
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.uuid,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyDublinCoreField(response, testData.folioInstance.uuid, {
                rights: 'discovery not suppressed',
              });

              // Step 26: Cross-tenant ListRecords oai_dc - Member-2 (using resumption token)
              cy.resetTenant();
              cy.getAdminToken();
              cy.setTenant(Affiliations.University);

              OaiPmhEdge.listRecordsRequestWithResumptionToken(
                resumptionTokenOaiDc,
                OaiPmhEdge.getApiKey(Affiliations.Consortia),
              ).then((responseUniversity) => {
                // Verify MARC instance present
                OaiPmh.verifyIdentifierInListResponse(
                  responseUniversity,
                  testData.marcInstance.uuid,
                  true,
                  false,
                  Affiliations.University,
                );

                // Verify FOLIO instance present
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
