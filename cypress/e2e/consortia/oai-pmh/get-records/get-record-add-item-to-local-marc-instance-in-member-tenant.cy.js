import { ELECTRONIC_ACCESS_RELATIONSHIP_NAME } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
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
    title: `AT_C409506_LocalMarcInstance_${getRandomPostfix()}`,
  },
  holdingsData: {
    callNumber: `Holdings_CN_${getRandomPostfix()}`,
  },
  itemData: {
    barcode: `item_barcode_${getRandomPostfix()}`,
  },
  itemBarcode: `item_barcode_${getRandomPostfix()}`,
  locationName: '',
  electronicAccessData: {
    uri: `https://example.com/resource_${getRandomPostfix()}`,
    linkText: 'Link text',
    materialsSpecified: 'Materials specified',
    publicNote: 'Public note',
  },
  holdingsId: null,
  materialTypeName: null,
  loanTypeName: null,
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

        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.locationName = locations[0].name;
          testData.locationId = locations[0].id;
        });
        cy.getDefaultMaterialType().then((materialType) => {
          testData.materialTypeName = materialType.name;
        });
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          testData.loanTypeName = loanTypes[0].name;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.sourceId = folioSource.id;
        });
        cy.createSimpleMarcBibViaAPI(testData.marcInstance.title).then((instanceId) => {
          testData.marcInstance.uuid = instanceId;

          cy.getInstanceById(instanceId).then((instanceData) => {
            testData.marcInstance.hrid = instanceData.hrid;

            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: instanceData.id,
              permanentLocationId: testData.locationId,
              sourceId: testData.sourceId,
            }).then((holdingsData) => {
              testData.holdingsId = holdingsData.id;
            });
          });
        });

        cy.resetTenant();
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
        cy.setTenant(Affiliations.College);
        if (testData.marcInstance?.uuid) {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.marcInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();
        cy.resetTenant();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C409506 Consortia | SRS | GetRecord: Add item to local MARC instance in Member tenant is retrieved in the response of single tenant harvest (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C409506', 'nonParallel'] },
        () => {
          // Step 1: Navigate to Inventory and search for local MARC instance
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.marcInstance.title);

          // Step 2: Open holdings view and add item
          InventoryInstance.addItem();
          ItemRecordNew.waitLoading(testData.marcInstance.title);

          // Step 3: Fill in item fields and save
          ItemRecordNew.fillItemRecordFields({
            barcode: testData.itemData.barcode,
            materialType: testData.materialTypeName,
            loanType: testData.loanTypeName,
          });
          ItemRecordNew.addElectronicAccessFields({
            relationshipType: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            uri: testData.electronicAccessData.uri,
            linkText: testData.electronicAccessData.linkText,
            materialsSpecified: testData.electronicAccessData.materialsSpecified,
            urlPublicNote: testData.electronicAccessData.publicNote,
          });
          ItemRecordNew.saveAndClose({ itemSaved: true });
          InventoryInstance.waitLoading();

          // Step 4: Verify GetRecord response with marc21 metadata format
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

          // Step 5: Verify GetRecord response with marc21_withholdings metadata format
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
              { t: '0' },
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

          // Step 6: Verify GetRecord response with oai_dc metadata format
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
