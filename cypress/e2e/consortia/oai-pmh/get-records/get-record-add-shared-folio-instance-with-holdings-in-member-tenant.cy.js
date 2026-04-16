import {
  APPLICATION_NAMES,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
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
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  user: {},
  folioInstance: {
    title: `AT_C405928_SharedFolioInstance_${getRandomPostfix()}`,
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
};
const collegeApiKey = Cypress.env('EDGE_COLLEGE_API_KEY');
const userPermissions = [Permissions.inventoryAll.gui];

describe('OAI-PMH', () => {
  describe('Consortia', () => {
    describe('GetRecord', () => {
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

        cy.resetTenant();

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
        // Delete holdings from College tenant where they were created
        cy.setTenant(Affiliations.College);
        if (testData.holdingsId) {
          cy.deleteHoldingRecordViaApi(testData.holdingsId);
        }
        Behavior.updateBehaviorConfigViaApi();
        // Delete instance from Central tenant where it was created
        cy.resetTenant();
        if (testData.folioInstance?.id) {
          InventoryInstance.deleteInstanceViaApi(testData.folioInstance.id);
        }
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C405928 Consortia | Inventory | GetRecord: Add shared FOLIO instance to Central tenant and enrich it with local FOLIO Holdings in Member tenant is retrieved in the response of single tenant harvest (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C405928', 'nonParallel'] },
        () => {
          // Step 1-3: Login to Central tenant and create shared FOLIO instance
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

          // Step 1: Select Actions => New shared record
          InventoryInstances.addNewInventory();

          // Step 2: Fill in Resource title
          InventoryNewInstance.fillResourceTitle(testData.folioInstance.title);

          // Step 3: Select Resource type
          InventoryNewInstance.fillResourceType();

          // Step 4: Click Save and close
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitLoading();
          InventoryInstance.verifyInstanceTitle(testData.folioInstance.title);

          // Get instance ID
          InventoryInstance.getId().then((instanceId) => {
            testData.folioInstance.id = instanceId;

            // Step 5: Switch to member tenant and search for the instance
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventoryInstances.waitContentLoading();
            InventorySearchAndFilter.clearDefaultHeldbyFilter();
            InventoryInstances.searchByTitle(testData.folioInstance.title);
            InventoryInstance.waitInstanceRecordViewOpened(testData.folioInstance.title);

            // Step 6-7: Add holdings record with call number, electronic access, and location
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

            // Capture holdings ID for cleanup
            InventoryInstance.openHoldingView();
            HoldingsRecordView.getHoldingsIDInDetailView().then((holdingsID) => {
              testData.holdingsId = holdingsID;
            });
            HoldingsRecordView.close();

            // Step 8: Verify GetRecord response with marc21 metadata format
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);
            OaiPmhEdge.getRecordRequest(
              testData.folioInstance.id,
              Affiliations.College,
              'marc21',
              collegeApiKey,
            ).then((response) => {
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
                { t: '0', i: testData.folioInstance.id },
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '245',
                { ind1: '0', ind2: '0' },
                { a: testData.folioInstance.title },
              );
            });

            // Step 9: Verify GetRecord response with marc21_withholdings metadata format
            OaiPmhEdge.getRecordRequest(
              testData.folioInstance.id,
              Affiliations.College,
              'marc21_withholdings',
              collegeApiKey,
            ).then((response) => {
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
                { t: '0', i: testData.folioInstance.id },
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '952',
                { ind1: 'f', ind2: 'f' },
                {
                  t: '0',
                  e: testData.holdingsData.callNumber,
                },
              );
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
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

            // Step 10: Verify GetRecord response with oai_dc metadata format
            OaiPmhEdge.getRecordRequest(
              testData.folioInstance.id,
              Affiliations.College,
              'oai_dc',
              collegeApiKey,
            ).then((response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
              OaiPmh.verifyDublinCoreField(response, testData.folioInstance.id, {
                title: testData.folioInstance.title,
              });
            });
          });
        },
      );
    });
  });
});
