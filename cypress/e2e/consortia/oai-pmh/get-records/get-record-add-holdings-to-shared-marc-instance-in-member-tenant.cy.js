import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import HoldingsRecordEdit from '../../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryNewHoldings from '../../../../support/fragments/inventory/inventoryNewHoldings';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
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
    title: `AT_C402372_SharedMarcInstance_${getRandomPostfix()}`,
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

        // Configure OAI-PMH behavior for College tenant with SRS source
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );

        // Get location for holdings from College tenant
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.locationName = locations[0].name;
        });

        cy.resetTenant();

        // Create shared MARC instance in Central tenant via API
        cy.createSimpleMarcBibViaAPI(testData.marcInstance.title).then((instanceId) => {
          testData.marcInstance.uuid = instanceId;

          cy.getInstanceById(instanceId).then((instanceData) => {
            testData.marcInstance.hrid = instanceData.hrid;
          });
        });

        // Create user with permissions in both Central and College tenants
        cy.createTempUser(userPermissions).then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: userPermissions,
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
        // Delete holdings from College tenant where they were created
        cy.setTenant(Affiliations.College);
        if (testData.holdingsId) {
          cy.deleteHoldingRecordViaApi(testData.holdingsId);
        }
        Behavior.updateBehaviorConfigViaApi();
        // Delete instance from Central tenant where it was created
        cy.resetTenant();
        if (testData.marcInstance?.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        }
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C402372 Consortia | SRS | GetRecord: Add FOLIO holdings to shared MARC instance in Member tenant is retrieved in the response of single tenant harvest (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C402372', 'nonParallel'] },
        () => {
          // Step 1: Search for shared MARC instance and open detailed view
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.marcInstance.title);

          // Step 2: Add Holdings by clicking "Add holdings" button
          InventoryInstance.pressAddHoldingsButton();

          // Step 3: Add values to Holdings record and save
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

          // Step 4: Close holdings view and note instance UUID (already captured)
          InventoryInstance.waitLoading();

          // Step 5: Verify GetRecord response with marc21 metadata format
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          OaiPmhEdge.getRecordRequest(
            testData.marcInstance.uuid,
            Affiliations.College,
            'marc21',
            collegeApiKey,
          ).then((response) => {
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
              '245',
              { ind1: ' ', ind2: ' ' },
              { a: testData.marcInstance.title },
            );
            OaiPmh.verifyMarcFieldAbsent(response, testData.marcInstance.uuid, ['856', '952']);
          });

          // Step 6: Verify GetRecord response with marc21_withholdings metadata format
          OaiPmhEdge.getRecordRequest(
            testData.marcInstance.uuid,
            Affiliations.College,
            'marc21_withholdings',
            collegeApiKey,
          ).then((response) => {
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
              { t: '0', e: testData.holdingsData.callNumber },
            );
            OaiPmh.verifyMarcField(
              response,
              testData.marcInstance.uuid,
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

          // Step 7: Verify GetRecord response with oai_dc metadata format
          OaiPmhEdge.getRecordRequest(
            testData.marcInstance.uuid,
            Affiliations.College,
            'oai_dc',
            collegeApiKey,
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
            OaiPmh.verifyDublinCoreField(response, testData.marcInstance.uuid, {
              title: testData.marcInstance.title,
            });
          });
        },
      );
    });
  });
});
