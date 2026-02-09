import {
  LOCATION_NAMES,
  CAMPUS_NAMES,
  INSTITUTION_NAMES,
  LIBRARY_NAMES,
  LOAN_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  APPLICATION_NAMES,
} from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import TopMenu from '../../../support/fragments/topMenu';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import DateTools from '../../../support/utils/dateTools';

let user;
const newUrlRelationshipName = `AT_C378100_URLRelationship_${getRandomPostfix()}`;
const testData = {
  instanceTitle: `AT_C378100_MarcInstance_${getRandomPostfix()}`,
  instanceId: null,
  instanceHrid: null,
  holdingsId: null,
  itemId: null,
  itemBarcode: `barcode_${getRandomPostfix()}`,
  holdingsElectronicAccess: {
    uri: 'http://holdings-new-relationship.com',
    linkText: 'Holdings link text',
    materialsSpecified: 'Holdings materials',
    urlPublicNote: 'Holdings URL public note',
  },
  itemElectronicAccess: {
    uri: 'http://item-new-relationship.com',
    linkText: 'Item link text',
    materialsSpecified: 'Item materials',
    urlPublicNote: 'Item URL public note',
  },
  locationData: {
    institutionName: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
    campusName: CAMPUS_NAMES.CITY_CAMPUS,
    libraryName: LIBRARY_NAMES.DATALOGISK_INSTITUT,
    locationName: LOCATION_NAMES.MAIN_LIBRARY_UI,
  },
};

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('create test data', () => {
      cy.getAdminToken();

      // Configure OAI-PMH Behavior
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      // Create MARC instance with SRS record
      cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
        testData.instanceId = instanceId;

        cy.getInstanceById(instanceId).then((instanceData) => {
          testData.instanceHrid = instanceData.hrid;

          // Get location and FOLIO source
          cy.getLocations({ query: `name=="${testData.locationData.locationName}"` }).then(
            (location) => {
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                // Create FOLIO holdings
                InventoryHoldings.createHoldingRecordViaApi({
                  instanceId: testData.instanceId,
                  permanentLocationId: location.id,
                  sourceId: folioSource.id,
                }).then((holding) => {
                  testData.holdingsId = holding.id;

                  // Create item with barcode
                  cy.getDefaultMaterialType().then((materialTypes) => {
                    const materialTypeId = materialTypes.id;

                    cy.getLoanTypes({ query: `name=="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then(
                      (loanTypes) => {
                        const loanTypeId = loanTypes[0].id;

                        InventoryItems.createItemViaApi({
                          holdingsRecordId: testData.holdingsId,
                          barcode: testData.itemBarcode,
                          materialType: { id: materialTypeId },
                          permanentLoanType: { id: loanTypeId },
                          status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                        }).then((item) => {
                          testData.itemId = item.id;
                        });
                      },
                    );
                  });
                });
              });
            },
          );
        });
      });

      // For clear test results, it is necessary to wait to ensure that
      // editing holding and item is treated as an update to the Instance record
      cy.wait(60_000);

      // Create user with required permissions
      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.uiCreateEditDeleteURL.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.settingsPath,
            waiter: SettingsPane.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      UrlRelationship.getViaApi({ query: `name=="${newUrlRelationshipName}"` }).then(
        (relationships) => {
          if (relationships.length > 0) {
            UrlRelationship.deleteViaApi(relationships[0].id);
          }
        },
      );
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C378100 ListRecords: SRS & Inventory - Verify that add to Holdings and Item "Electronic access" with recently created URL relationship type triggers harvesting records with marc21_withholdings (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C378100', 'nonParallel'] },
      () => {
        // Step 1-2: Navigate to Settings → Inventory → URL relationship
        UrlRelationship.openTabFromInventorySettingsList();
        UrlRelationship.waitloading();

        // Step 3: Create new URL relationship via UI
        UrlRelationship.createNewRelationship(newUrlRelationshipName);
        UrlRelationship.verifyElectronicAccessNameOnTable(newUrlRelationshipName);

        // Step 4-5: Search for instance and open it
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.waitLoading();
        InventorySearchAndFilter.searchByParameter('Title (all)', testData.instanceTitle);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 6: Open holdings view
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();

        // Step 7: Open holdings in edit mode
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();

        // Step 8-9: Add electronic access to holdings with new URL relationship
        HoldingsRecordEdit.addElectronicAccessFields({
          relationshipName: newUrlRelationshipName,
          uri: testData.holdingsElectronicAccess.uri,
          linkText: testData.holdingsElectronicAccess.linkText,
          materialsSpecified: testData.holdingsElectronicAccess.materialsSpecified,
          urlPublicNote: testData.holdingsElectronicAccess.urlPublicNote,
          index: 0,
        });

        // Step 10: Save holdings
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        HoldingsRecordView.checkHoldingRecordViewOpened();

        // Step 11: Go back to instance and open item
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldingsAccordion(testData.locationData.locationName);
        InventoryInstance.openItemByBarcode(testData.itemBarcode);
        ItemRecordView.waitLoading();

        const fromDate = DateTools.getCurrentDateForOaiPmh();
        // Step 12: Open item in edit mode
        ItemRecordView.openItemEditForm(testData.instanceTitle);

        // Step 13-14: Add electronic access to item with new URL relationship
        ItemRecordNew.addElectronicAccessFields({
          relationshipType: newUrlRelationshipName,
          uri: testData.itemElectronicAccess.uri,
          linkText: testData.itemElectronicAccess.linkText,
          materialsSpecified: testData.itemElectronicAccess.materialsSpecified,
          urlPublicNote: testData.itemElectronicAccess.urlPublicNote,
          rowNumber: 1,
        });

        // Step 15: Save item
        ItemRecordNew.saveAndClose({ itemSaved: true });
        ItemRecordView.waitLoading();

        // Step 16: Note instance UUID (already stored in testData.instanceId)
        // Step 17-18: Send ListRecords request and verify electronic access in 856 fields
        cy.getAdminToken();

        const untilDate = DateTools.getCurrentDateForOaiPmh(1);

        OaiPmh.listRecordsRequest('marc21_withholdings', fromDate, untilDate).then((response) => {
          // Verify both Holdings and Item electronic access in 856 fields with same indicators
          OaiPmh.verifyMultipleMarcFieldsWithIdenticalTagAndIndicators(
            response,
            testData.instanceId,
            '856',
            { ind1: '4', ind2: ' ' },
            [
              {
                u: testData.itemElectronicAccess.uri,
                y: testData.itemElectronicAccess.linkText,
                3: testData.itemElectronicAccess.materialsSpecified,
                z: testData.itemElectronicAccess.urlPublicNote,
              },
              {
                u: testData.holdingsElectronicAccess.uri,
                y: testData.holdingsElectronicAccess.linkText,
                3: testData.holdingsElectronicAccess.materialsSpecified,
                z: testData.holdingsElectronicAccess.urlPublicNote,
              },
            ],
            2,
          );

          // Verify 952 field contains correct location and item metadata
          OaiPmh.verifyMarcField(
            response,
            testData.instanceId,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: testData.locationData.institutionName,
              b: testData.locationData.campusName,
              c: testData.locationData.libraryName,
              d: testData.locationData.locationName,
              m: testData.itemBarcode,
            },
          );
        });
      },
    );
  });
});
