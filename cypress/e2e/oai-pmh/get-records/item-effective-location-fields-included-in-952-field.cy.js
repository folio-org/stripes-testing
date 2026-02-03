import {
  LOCATION_NAMES,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  CAMPUS_NAMES,
  INSTITUTION_NAMES,
  LIBRARY_NAMES,
} from '../../../support/constants';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import ItemRecordEdit from '../../../support/fragments/inventory/item/itemRecordEdit';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const marcInstance = {
  title: `AT_C386506_MarcInstance_${getRandomPostfix()}`,
};
const itemBarcode = getRandomPostfix();
const locations = {};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      // Define location names and their corresponding location object properties
      const locationQueries = [
        { name: LOCATION_NAMES.MAIN_LIBRARY_UI, property: 'holdingsPermanent' },
        { name: LOCATION_NAMES.ANNEX_UI, property: 'holdingsTemporary' },
        { name: LOCATION_NAMES.SECOND_FLOOR_UI, property: 'itemPermanent' },
        { name: LOCATION_NAMES.POPULAR_READING_COLLECTION_UI, property: 'itemTemporary' },
      ];
      cy.then(() => {
        locationQueries.forEach((location) => {
          cy.getLocations({ query: `name="${location.name}"` }).then((locationData) => {
            locations[location.property] = locationData;
          });
        });
      }).then(() => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.moduleDataImportEnabled.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceResponse) => {
            marcInstance.id = instanceResponse;

            cy.getInstanceById(marcInstance.id).then((instanceData) => {
              marcInstance.hrid = instanceData.hrid;

              cy.createSimpleMarcHoldingsViaAPI(
                marcInstance.id,
                marcInstance.hrid,
                locations.holdingsPermanent.code,
              ).then(() => {
                cy.getHoldings({
                  limit: 1,
                  query: `"instanceId"="${marcInstance.id}"`,
                }).then((holdings) => {
                  cy.updateHoldingRecord(holdings[0].id, {
                    ...holdings[0],
                    temporaryLocationId: locations.holdingsTemporary.id,
                  });
                });
              });
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventorySearchAndFilter.waitLoading,
          });
          InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C386506 GetRecord: SRS - Verify that Item "Effective location" fields are properly included in "952" field of response (subfields "a", "b", "c", "d", "s") (firebird)',
      { tags: ['extendedPath', 'firebird', 'C386506'] },
      () => {
        // Step 1: Add Item to the Instance by clicking "Add item" button
        InventoryInstance.addItem();

        // Step 2-3: Fill in item record fields
        ItemRecordNew.fillItemRecordFields({
          barcode: itemBarcode,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });

        // Step 4-6: Set Item permanent location
        ItemRecordNew.selectPermanentLocation(locations.itemPermanent.name);

        // Step 7-9: Set Item temporary location
        ItemRecordNew.selectTemporaryLocation(locations.itemTemporary.name);

        // Step 10: Save & close item
        ItemRecordNew.saveAndClose();
        InventoryInstance.waitLoading();

        // Step 12-13: Send OAI-PMH GetRecord request and verify 952 field with Item temporary location
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
              b: CAMPUS_NAMES.CITY_CAMPUS,
              c: LIBRARY_NAMES.DATALOGISK_INSTITUT,
              d: locations.itemTemporary.name,
              s: locations.itemTemporary.name,
            },
          );
        });

        // Step 14: Navigate to item and edit
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldings(['']);
        InventoryInstance.openItemByBarcode(itemBarcode);
        ItemRecordView.openItemEditForm(marcInstance.title);

        // Step 15-16: Remove Item temporary location
        ItemRecordEdit.clearValueInTemporaryLocation();
        ItemRecordEdit.saveAndClose();
        ItemRecordView.waitLoading();

        // Step 17-18: Send OAI-PMH GetRecord request and verify 952 field with Item permanent location
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
              b: CAMPUS_NAMES.CITY_CAMPUS,
              c: LIBRARY_NAMES.DATALOGISK_INSTITUT,
              d: locations.itemPermanent.name,
              s: locations.itemPermanent.name,
            },
          );
        });

        // Step 19-21: Remove Item permanent location
        cy.getUserToken(user.username, user.password);
        ItemRecordView.openItemEditForm(marcInstance.title);
        ItemRecordEdit.clearValueInPermanentLocation();
        ItemRecordEdit.saveAndClose();
        ItemRecordView.waitLoading();

        // Step 22: Close item window (return to instance view)
        ItemRecordView.closeDetailView();

        // Step 23-24: Send OAI-PMH GetRecord request and verify 952 field with Holdings temporary location
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
              b: CAMPUS_NAMES.CITY_CAMPUS,
              c: LIBRARY_NAMES.DATALOGISK_INSTITUT,
              d: locations.holdingsTemporary.name,
              s: locations.holdingsTemporary.name,
            },
          );
        });

        // Step 25-27: Remove Holdings temporary location
        cy.getUserToken(user.username, user.password);
        InventoryInstance.viewHoldings();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.clearTemporaryLocation();
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordView.checkHoldingRecordViewOpened();

        // Step 28-29: Send OAI-PMH GetRecord request and verify 952 field with Holdings permanent location
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
              b: CAMPUS_NAMES.CITY_CAMPUS,
              c: LIBRARY_NAMES.DATALOGISK_INSTITUT,
              d: locations.holdingsPermanent.name,
              s: locations.holdingsPermanent.name,
            },
          );
        });
      },
    );
  });
});
