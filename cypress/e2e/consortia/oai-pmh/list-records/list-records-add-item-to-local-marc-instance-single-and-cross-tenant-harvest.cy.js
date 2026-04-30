import {
  APPLICATION_NAMES,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordNew from '../../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import OaiPmh from '../../../../support/fragments/oai-pmh/oaiPmh';
import OaiPmhEdge from '../../../../support/fragments/oai-pmh/oaiPmhEdge';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { Behavior } from '../../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../../support/fragments/settings/oai-pmh/behavior';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

const testData = {
  user: {},
  marcInstance: {
    title: `AT_C410740_LocalMarcInstance_${getRandomPostfix()}`,
    uuid: null,
  },
  holdingsId: null,
  itemData: {
    barcode: `Item_${getRandomPostfix()}`,
    materialType: 'book',
    permanentLoanType: 'Can circulate',
    electronicAccess: {
      uri: `https://example.com/item_${getRandomPostfix()}`,
      linkText: 'Item link text',
      materialsSpecified: 'Item materials',
      publicNote: 'Item public note',
    },
  },
  itemId: null,
  locationName: null,
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
        // Configure OAI-PMH behavior for College tenant
        cy.setTenant(Affiliations.College);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );
        // Get location for holdings from College tenant
        InventoryInstances.getLocations({ limit: 2 }).then((resp) => {
          const locations = resp.filter((location) => location.name !== 'DCB');
          testData.locationName = locations[0].name;
          const locationId = locations[0].id;

          // Create local MARC instance in College tenant (member-1)
          cy.createSimpleMarcBibViaAPI(testData.marcInstance.title).then((instanceId) => {
            testData.marcInstance.uuid = instanceId;

            // Create Holdings record for the MARC instance
            InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.marcInstance.uuid,
                permanentLocationId: locationId,
                sourceId: folioSource.id,
              }).then((holding) => {
                testData.holdingsId = holding.id;
              });
            });
          });
        });
        // Configure OAI-PMH behavior for University tenant
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );
        // Configure OAI-PMH behavior for Central tenant
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi(
          BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
          BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        );
        // Create user with permissions in both Central and College tenants
        cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: [Permissions.inventoryAll.gui],
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          cy.wait(120_000); // Wait for 2 minutes to ensure the instance is created "in the past" for OAI-PMH requests with current date as from/until
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        // Delete item, holdings and instance from College tenant
        cy.setTenant(Affiliations.College);
        if (testData.itemId) {
          InventoryItems.deleteItemViaApi(testData.itemId);
        }
        if (testData.holdingsId) {
          cy.deleteHoldingRecordViaApi(testData.holdingsId);
        }
        if (testData.marcInstance.uuid) {
          InventoryInstance.deleteInstanceViaApi(testData.marcInstance.uuid);
        }
        Behavior.updateBehaviorConfigViaApi();
        // Reset OAI-PMH settings for University tenant
        cy.setTenant(Affiliations.University);
        Behavior.updateBehaviorConfigViaApi();
        // Reset OAI-PMH settings for Central tenant
        cy.resetTenant();
        Behavior.updateBehaviorConfigViaApi();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C410740 Consortia | SRS | ListRecords | ListIdentifiers: Add Item to local MARC instance in Member tenant is retrieved in the responses of single tenant and cross-tenant harvests (consortia) (firebird)',
        { tags: ['extendedPathECS', 'firebird', 'C410740', 'nonParallel'] },
        () => {
          // Step 1-2: Search for MARC Instance from Preconditions and open detail view
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.marcInstance.uuid);
          InventoryInstance.waitInstanceRecordViewOpened(testData.marcInstance.title);
          InventoryInstance.openHoldingsAccordion(testData.locationName);

          // Step 3-4: Verify instance NOT in current date OAI-PMH response before adding item
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          OaiPmhEdge.listRecordsRequest('marc21', OaiPmhEdge.getApiKey(Affiliations.College)).then(
            (response) => {
              // Verify the response doesn't include MARC Instance with Instance UUID
              OaiPmh.verifyIdentifierInListResponse(response, testData.marcInstance.uuid, false);
            },
          );

          // Step 5-6: Add Item to Holdings via UI
          cy.resetTenant();
          cy.getUserToken(testData.user.username, testData.user.password);
          cy.setTenant(Affiliations.College);

          InventoryInstance.clickAddItemByHoldingId({
            holdingId: testData.holdingsId,
            instanceTitle: testData.marcInstance.title,
          });
          ItemRecordNew.waitLoading(testData.marcInstance.title);
          ItemRecordNew.fillItemRecordFields({
            barcode: testData.itemData.barcode,
            materialType: testData.itemData.materialType,
            loanType: testData.itemData.permanentLoanType,
          });
          ItemRecordNew.addElectronicAccessFields({
            relationshipType: ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            uri: testData.itemData.electronicAccess.uri,
            linkText: testData.itemData.electronicAccess.linkText,
            materialsSpecified: testData.itemData.electronicAccess.materialsSpecified,
            urlPublicNote: testData.itemData.electronicAccess.publicNote,
          });
          ItemRecordNew.saveAndClose({ itemSaved: true });
          cy.wait(3000);
          InventoryInstance.openHoldings(testData.locationName);
          InventoryInstance.openItemByBarcode(testData.itemData.barcode);
          ItemRecordView.getAssignedHRID().then((itemHRID) => {
            testData.itemHRID = itemHRID;
            // Get item ID for cleanup
            InventoryItems.getItemViaApi({ query: `hrid=="${itemHRID}"` }).then((items) => {
              testData.itemId = items[0].id;
            });
          });

          // Step 7: Verify single-tenant ListRecords marc21 for College tenant
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);

          OaiPmhEdge.listRecordsRequest('marc21', OaiPmhEdge.getApiKey(Affiliations.College)).then(
            (response) => {
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
              OaiPmh.verifyMarcFieldAbsent(response, testData.marcInstance.uuid, '952');
            },
          );

          // Step 8: Verify single-tenant ListIdentifiers marc21 for College tenant
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
          });

          // Step 9: Verify single-tenant ListRecords marc21_withholdings for College tenant
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.College),
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
          });

          // Step 10: Verify single-tenant ListIdentifiers marc21_withholdings for College tenant
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
          });

          // Step 11: Verify single-tenant ListRecords oai_dc for College tenant
          OaiPmhEdge.listRecordsRequest('oai_dc', OaiPmhEdge.getApiKey(Affiliations.College)).then(
            (response) => {
              OaiPmh.verifyOaiPmhRecordHeader(
                response,
                testData.marcInstance.uuid,
                false,
                true,
                Affiliations.College,
              );
            },
          );

          // Step 12: Verify single-tenant ListIdentifiers oai_dc for College tenant
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
          });

          // Step 13: Verify cross-tenant ListRecords marc21 for Central tenant
          OaiPmhEdge.listRecordsRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
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
            OaiPmh.verifyMarcFieldAbsent(response, testData.marcInstance.uuid, '952');
          });

          // Step 14: Verify cross-tenant ListIdentifiers marc21 for Central tenant
          OaiPmhEdge.listIdentifiersRequest(
            'marc21',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 15: Verify cross-tenant ListRecords marc21_withholdings for Central tenant
          OaiPmhEdge.listRecordsRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
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
          });

          // Step 16: Verify cross-tenant ListIdentifiers marc21_withholdings for Central tenant
          OaiPmhEdge.listIdentifiersRequest(
            'marc21_withholdings',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });

          // Step 17: Verify cross-tenant ListRecords oai_dc for Central tenant
          OaiPmhEdge.listRecordsRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyOaiPmhRecordHeader(
              response,
              testData.marcInstance.uuid,
              false,
              true,
              Affiliations.College,
            );
          });

          // Step 18: Verify cross-tenant ListIdentifiers oai_dc for Central tenant
          OaiPmhEdge.listIdentifiersRequest(
            'oai_dc',
            OaiPmhEdge.getApiKey(Affiliations.Consortia),
          ).then((response) => {
            OaiPmh.verifyIdentifierInListResponse(
              response,
              testData.marcInstance.uuid,
              true,
              false,
              Affiliations.College,
            );
          });
        },
      );
    });
  });
});
