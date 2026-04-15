import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import InventoryNewHoldings from '../../../../support/fragments/inventory/inventoryNewHoldings';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewInstance from '../../../../support/fragments/inventory/inventoryNewInstance';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  user: {},
  folioInstance: {
    title: `AT_C407761_LocalFolioInstance_${getRandomPostfix()}`,
  },
  holdingsData: {
    callNumber: `Holdings_CN_${getRandomPostfix()}`,
  },
  electronicAccessData: {
    uri: `https://example.com/resource_${getRandomPostfix()}`,
    linkText: 'Link text',
    materialsSpecified: 'Materials specified',
    publicNote: 'Public note',
  },
};
const collegeApiKey = Cypress.env('EDGE_COLLEGE_API_KEY');

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
          BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
          BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
        );

        // Get location for holdings
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.locationName = locations[0].name;
        });

        cy.resetTenant();

        // Create user with inventory permissions in both central and College tenant
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;
          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: [Permissions.inventoryAll.gui],
          });

          // Login and switch to College tenant
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        if (testData.folioInstance.id) {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.folioInstance.id);
        }
        Behavior.updateBehaviorConfigViaApi();
        cy.resetTenant();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C407761 Consortia | Inventory | GetRecord: Add local FOLIO instance to Member tenant and enrich it with local FOLIO Holdings in Member tenant is retrieved in the response of single tenant harvest (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C407761'] },
        () => {
          // Step 1: Go to "Inventory" app => Select "Actions" => Select "New local record" button
          InventoryInstances.addNewInventory();

          // Step 2: Fill in the "Resource title*" field with Instance's title
          InventoryNewInstance.fillResourceTitle(testData.folioInstance.title);

          // Step 3: Select from the "Resource type*" dropdown any existing resource type
          InventoryNewInstance.fillResourceType();

          // Step 4: Click the "Save and close" button
          InventoryNewInstance.clickSaveAndCloseButton();
          InventoryInstance.waitLoading();
          InventoryInstance.verifyInstanceTitle(testData.folioInstance.title);

          InventoryInstance.getId().then((instanceId) => {
            testData.folioInstance.id = instanceId;

            // Step 5: Send GetRecord request with marc21 format
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);
            OaiPmhEdge.getRecordRequest(
              testData.folioInstance.id,
              Affiliations.College,
              'marc21',
              collegeApiKey,
            ).then((response) => {
              // Verify FOLIO record in marc21 format
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '0', i: testData.folioInstance.id },
              );
              // Verify header with College tenant identifier
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
            });

            // Step 6: Navigate to "Inventory" app => Search for instance => Click on row
            cy.resetTenant();
            cy.getUserToken(testData.user.username, testData.user.password);
            cy.setTenant(Affiliations.College);

            // Step 7: Add Holdings by clicking on the "Add holdings" button
            InstanceRecordView.addHoldings();

            // Step 8: Add values to Holdings record (call number/Electronic access/Holdings locations) => Click "Save & close" button
            InventoryNewHoldings.fillPermanentLocation(testData.locationName);
            InventoryNewHoldings.fillCallNumber(testData.holdingsData.callNumber);
            HoldingsRecordEdit.addElectronicAccessFields({
              relationshipName: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
              uri: testData.electronicAccessData.uri,
              linkText: testData.electronicAccessData.linkText,
              materialsSpecified: testData.electronicAccessData.materialsSpecified,
              urlPublicNote: testData.electronicAccessData.publicNote,
            });
            InventoryNewHoldings.saveAndClose();
            InventoryInstance.waitLoading();

            // Step 9: Send GetRecord request with marc21_withholdings format
            cy.resetTenant();
            cy.getAdminToken();
            cy.setTenant(Affiliations.College);
            OaiPmhEdge.getRecordRequest(
              testData.folioInstance.id,
              Affiliations.College,
              'marc21_withholdings',
              collegeApiKey,
            ).then((response) => {
              // Verify instance data in 999 field
              OaiPmh.verifyMarcField(
                response,
                testData.folioInstance.id,
                '999',
                { ind1: 'f', ind2: 'f' },
                { t: '0', i: testData.folioInstance.id },
              );

              // Verify holdings data in 952 field
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

              // Verify electronic access in 856 field
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

              // Verify header with College tenant identifier
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
            });

            // Step 10: Send GetRecord request with oai_dc format
            OaiPmhEdge.getRecordRequest(
              testData.folioInstance.id,
              Affiliations.College,
              'oai_dc',
              collegeApiKey,
            ).then((response) => {
              // Verify Dublin Core record
              OaiPmh.verifyDublinCoreField(response, testData.folioInstance.id, {
                title: testData.folioInstance.title,
              });
              // Verify header with College tenant identifier
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.folioInstance.id,
                false,
                true,
                Affiliations.College,
              );
            });
          });
        },
      );
    });
  });
});
