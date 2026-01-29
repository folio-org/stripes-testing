import {
  LOCATION_NAMES,
  CAMPUS_NAMES,
  INSTITUTION_NAMES,
  LIBRARY_NAMES,
  MATERIAL_TYPE_NAMES,
  LOAN_TYPE_NAMES,
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
const folioInstance = {
  title: `AT_C386503_FolioInstance_${getRandomPostfix()}`,
};
const itemBarcode = `barcode_${getRandomPostfix()}`;
const locationData = {
  holdingsPermanent: {
    institutionName: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
    campusName: CAMPUS_NAMES.CITY_CAMPUS,
    libraryName: LIBRARY_NAMES.DATALOGISK_INSTITUT,
    locationName: LOCATION_NAMES.MAIN_LIBRARY_UI,
  },
  holdingsTemporary: {
    institutionName: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
    campusName: 'Online',
    libraryName: 'Online',
    locationName: LOCATION_NAMES.ONLINE_UI,
  },
  itemPermanent: {
    institutionName: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
    campusName: CAMPUS_NAMES.CITY_CAMPUS,
    libraryName: LIBRARY_NAMES.DATALOGISK_INSTITUT,
    locationName: LOCATION_NAMES.POPULAR_READING_COLLECTION_UI,
  },
  itemTemporary: {
    institutionName: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
    campusName: CAMPUS_NAMES.CITY_CAMPUS,
    libraryName: LIBRARY_NAMES.DATALOGISK_INSTITUT,
    locationName: LOCATION_NAMES.ANNEX_UI,
  },
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();

      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: folioInstance.title,
          },
        }).then((instanceData) => {
          folioInstance.id = instanceData.instanceId;
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C386503 GetRecord: Inventory - Verify that Item "Effective location" fields are properly included in "952" field of response (subfields "a", "b", "c", "d", "s") (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C386503', 'nonParallel'] },
      () => {
        // Step 1: Search for FOLIO instance with no associated holdings
        InventoryInstances.searchByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 2: Add Holdings by clicking "Add holdings" button
        InventoryInstance.pressAddHoldingsButton();
        HoldingsRecordEdit.waitLoading();

        // Step 3-5: Select Holdings permanent location
        HoldingsRecordEdit.changePermanentLocation(locationData.holdingsPermanent.locationName);

        // Step 6-8: Select Holdings temporary location
        HoldingsRecordEdit.selectTemporaryLocation(locationData.holdingsTemporary.locationName);

        // Step 9: Click "Save & close" button
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        InventoryInstance.waitLoading();

        // Step 10: Add Item by clicking "Add item" button
        InventoryInstance.addItem();

        // Step 11-12: Select material type, loan type, add barcode
        ItemRecordNew.fillItemRecordFields({
          barcode: itemBarcode,
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          loanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        });

        // Step 13-15: Select Item permanent location
        ItemRecordNew.selectPermanentLocation(locationData.itemPermanent.locationName);

        // Step 16-18: Select Item temporary location
        ItemRecordNew.selectTemporaryLocation(locationData.itemTemporary.locationName);

        // Step 19: Click "Save & close" button
        ItemRecordNew.saveAndClose({ itemSaved: true });
        InventoryInstance.waitLoading();

        // Step 20-22: Send OAI-PMH GetRecord request and verify Item temporary location
        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: locationData.itemTemporary.institutionName,
              b: locationData.itemTemporary.campusName,
              c: locationData.itemTemporary.libraryName,
              d: locationData.itemTemporary.locationName,
              s: locationData.itemTemporary.locationName,
            },
          );
        });

        // Step 23: Open Item in edit mode
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldingsAccordion(locationData.holdingsPermanent.locationName);
        InventoryInstance.openItemByBarcode(itemBarcode);
        ItemRecordView.waitLoading();
        ItemRecordView.openItemEditForm(folioInstance.title);

        // Step 24: Remove Item temporary location
        ItemRecordEdit.clearValueInTemporaryLocation();

        // Step 25: Click "Save & close" button
        ItemRecordEdit.saveAndClose();
        ItemRecordView.verifyCalloutMessage();

        // Step 26-27: Send OAI-PMH GetRecord request and verify Item permanent location
        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: locationData.itemPermanent.institutionName,
              b: locationData.itemPermanent.campusName,
              c: locationData.itemPermanent.libraryName,
              d: locationData.itemPermanent.locationName,
              s: locationData.itemPermanent.locationName,
            },
          );
        });

        // Step 28: Open Item in edit mode
        cy.getUserToken(user.username, user.password);
        ItemRecordView.openItemEditForm(folioInstance.title);

        // Step 29: Remove Item permanent location
        ItemRecordEdit.clearValueInPermanentLocation();

        // Step 30: Click "Save & close" button
        ItemRecordEdit.saveAndClose();
        ItemRecordView.verifyCalloutMessage();

        // Step 31: Close Item window
        ItemRecordView.closeDetailView();
        InventoryInstance.waitLoading();

        // Step 32-33: Send OAI-PMH GetRecord request and verify Holdings temporary location
        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: locationData.holdingsTemporary.institutionName,
              b: locationData.holdingsTemporary.campusName,
              c: locationData.holdingsTemporary.libraryName,
              d: locationData.holdingsTemporary.locationName,
              s: locationData.holdingsTemporary.locationName,
            },
          );
        });

        // Step 34-35: Open Holdings in edit mode
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();

        // Step 36: Remove Holdings temporary location
        HoldingsRecordEdit.clearTemporaryLocation();

        // Step 37: Click "Save & close" button
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        HoldingsRecordView.checkHoldingRecordViewOpened();

        // Step 38-39: Send OAI-PMH GetRecord request and verify Holdings permanent location
        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: locationData.holdingsPermanent.institutionName,
              b: locationData.holdingsPermanent.campusName,
              c: locationData.holdingsPermanent.libraryName,
              d: locationData.holdingsPermanent.locationName,
              s: locationData.holdingsPermanent.locationName,
            },
          );
        });
      },
    );
  });
});
