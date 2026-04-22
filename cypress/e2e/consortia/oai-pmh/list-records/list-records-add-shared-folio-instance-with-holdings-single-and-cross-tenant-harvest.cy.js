import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../../support/fragments/inventory/inventoryNewHoldings';
import InventoryNewInstance from '../../../../support/fragments/inventory/inventoryNewInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';

const testData = {
  user: {},
  folioInstance: {
    title: `AT_C407760_SharedFolioInstance_${getRandomPostfix()}`,
    id: null,
  },
  holdingsData: {
    callNumber: `Holdings_CN_${getRandomPostfix()}`,
  },
  locationName: '',
  electronicAccessData: {
    uri: `https://example.com/resource_${getRandomPostfix()}`,
    linkText: 'Link text',
    materialsSpecified: 'Materials specified',
    publicNote: 'Public note',
  },
  holdingsId: null,
  currentDate: null,
};

const collegeApiKey = Cypress.env('EDGE_COLLEGE_API_KEY');
const centralApiKey = Cypress.env('EDGE_CENTRAL_API_KEY');
const userPermissions = [Permissions.inventoryAll.gui];

describe('OAI-PMH', () => {
  describe('ListRecords', () => {
    describe('Consortia', () => {
      // eslint-disable-next-line func-names
      before('Create test data', function () {
        // Skip test if Edge configuration is not available
        if (!OaiPmhEdge.isEdgeConfigured()) {
          this.skip();
        }

        cy.getAdminToken();

        // Configure OAI-PMH behavior for College tenant
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
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
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        );

        // Configure OAI-PMH behavior for Central tenant
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        );

        // Create user with permissions in both Central and College tenants
        cy.createTempUser(userPermissions).then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: userPermissions,
          });
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
        if (testData.folioInstance.id) {
          InventoryInstance.deleteInstanceViaApi(testData.folioInstance.id);
        }
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C407760 Consortia | Inventory | ListRecords |ListIdentifiers: Add shared FOLIO instance to Central tenant and enrich it with local FOLIO Holdings in Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C407760', 'nonParallel'] },
        () => {
          // Steps 1-4: Login to Central tenant and create shared FOLIO instance
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

          // Step 1: Select Actions => New shared record
          InventoryInstances.addNewInventory();

          // Step 2: Fill in Resource title
          InventoryNewInstance.fillResourceTitle(testData.folioInstance.title);

          // Step 3: Select Resource type => Save & close button becomes active
          InventoryNewInstance.fillResourceType();

          // Step 4: Click Save and close
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitLoading();
          InventoryInstance.verifyInstanceTitle(testData.folioInstance.title);

          // Get instance UUID
          InventoryInstance.getId().then((instanceId) => {
            testData.folioInstance.id = instanceId;

            // Step 5: Switch to College tenant and add local holdings
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(testData.folioInstance.title);
            InventoryInstance.waitInstanceRecordViewOpened(testData.folioInstance.title);

            // Add holdings with call number, electronic access, and location
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

            // Get holdings ID for cleanup
            HoldingsRecordView.getHoldingsIDInDetailView().then((holdingId) => {
              testData.holdingsId = holdingId;
            });

            // Step 6: ListRecords marc21 for College tenant
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);
            OaiPmhEdge.listRecordsRequest('marc21', collegeApiKey).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
            });

            // Step 7: ListIdentifiers marc21 for College tenant
            OaiPmhEdge.listIdentifiersRequest('marc21', collegeApiKey).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.id,
                true,
                false,
                Affiliations.College,
              );
            });

            // Step 8: ListRecords marc21_withholdings for College tenant
            OaiPmhEdge.listRecordsRequest('marc21_withholdings', collegeApiKey).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '952',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
            });

            // Step 9: ListIdentifiers marc21_withholdings for College tenant
            OaiPmhEdge.listIdentifiersRequest('marc21_withholdings', collegeApiKey).then(
              (response) => {
                OaiPmh.verifyIdentifierInListResponse(
                  response,
                  testData.folioInstance.id,
                  true,
                  false,
                  Affiliations.College,
                );
              },
            );

            // Step 10: ListRecords oai_dc for College tenant
            OaiPmhEdge.listRecordsRequest('oai_dc', collegeApiKey).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
            });

            // Step 11: ListIdentifiers oai_dc for College tenant
            OaiPmhEdge.listIdentifiersRequest('oai_dc', collegeApiKey).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.id,
                true,
                false,
                Affiliations.College,
              );
            });

            // Step 12: ListRecords marc21 for Central tenant (all members)
            cy.resetTenant();
            cy.getAdminToken();
            OaiPmhEdge.listRecordsRequest('marc21', centralApiKey).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
            });

            // Step 13: ListIdentifiers marc21 for Central tenant
            OaiPmhEdge.listIdentifiersRequest('marc21', centralApiKey).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.id,
                true,
                false,
                Affiliations.College,
              );
            });

            // Step 14: ListRecords marc21_withholdings for Central tenant
            OaiPmhEdge.listRecordsRequest('marc21_withholdings', centralApiKey).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '952',
                { ind1: 'f', ind2: 'f' },
                { t: '0' },
              );
            });

            // Step 15: ListIdentifiers marc21_withholdings for Central tenant
            OaiPmhEdge.listIdentifiersRequest('marc21_withholdings', centralApiKey).then(
              (response) => {
                OaiPmh.verifyIdentifierInListResponse(
                  response,
                  testData.folioInstance.id,
                  true,
                  false,
                  Affiliations.College,
                );
              },
            );

            // Step 16: ListRecords oai_dc for Central tenant
            OaiPmhEdge.listRecordsRequest('oai_dc', centralApiKey).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
            });

            // Step 17: ListIdentifiers oai_dc for Central tenant
            OaiPmhEdge.listIdentifiersRequest('oai_dc', centralApiKey).then((response) => {
              OaiPmh.verifyIdentifierInListResponse(
                response,
                testData.folioInstance.id,
                true,
                false,
                Affiliations.College,
              );
            });
          });
        },
      );
    });
  });
});
