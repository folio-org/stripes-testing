import {
  LOCATION_NAMES,
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
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';

let user;
const folioInstance = {
  title: `AT_C386501_FolioInstance_${getRandomPostfix()}`,
};
const locationData = {
  permanent: {
    institutionName: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
    campusName: CAMPUS_NAMES.CITY_CAMPUS,
    libraryName: LIBRARY_NAMES.DATALOGISK_INSTITUT,
    locationName: LOCATION_NAMES.MAIN_LIBRARY_UI,
  },
  temporary: {
    institutionName: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
    campusName: 'Online',
    libraryName: 'Online',
    locationName: LOCATION_NAMES.ONLINE_UI,
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
      'C386501 GetRecord: Inventory - Verify that Holdings "Effective location" fields are properly included in "952" field of response (subfields "a", "b", "c", "d", "s") (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C386501', 'nonParallel'] },
      () => {
        // Step 1: Search for FOLIO instance with no associated holdings
        InventoryInstances.searchByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 2: Add Holdings by clicking "Add holdings" button
        InventoryInstance.pressAddHoldingsButton();
        HoldingsRecordEdit.waitLoading();

        // Step 3-5: Select Holdings permanent location
        HoldingsRecordEdit.changePermanentLocation(locationData.permanent.locationName);

        // Step 6: Click "Save & close" button
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        InventoryInstance.waitLoading();

        // Step 7-9: Send OAI-PMH GetRecord request and verify 952 field with permanent location
        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: locationData.permanent.institutionName,
              b: locationData.permanent.campusName,
              c: locationData.permanent.libraryName,
              d: locationData.permanent.locationName,
              s: locationData.permanent.locationName,
            },
          );
        });

        // Step 10-11: Open holdings in edit mode
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.edit();
        HoldingsRecordEdit.waitLoading();

        // Step 12-13: Select Holdings temporary location (different from permanent)
        HoldingsRecordEdit.selectTemporaryLocation(locationData.temporary.locationName);

        // Step 14: Click "Save & close" button
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        HoldingsRecordView.checkHoldingRecordViewOpened();

        // Step 15: Close Holdings window
        HoldingsRecordView.close();
        InventoryInstance.waitLoading();

        // Step 16-17: Send OAI-PMH GetRecord request again and verify 952 field with temporary location
        cy.getAdminToken();
        OaiPmh.getRecordRequest(folioInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            folioInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: locationData.temporary.institutionName,
              b: locationData.temporary.campusName,
              c: locationData.temporary.libraryName,
              d: locationData.temporary.locationName,
              s: locationData.temporary.locationName,
            },
          );
        });
      },
    );
  });
});
