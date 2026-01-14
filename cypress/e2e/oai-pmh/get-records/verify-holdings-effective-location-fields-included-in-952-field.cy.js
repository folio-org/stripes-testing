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
const marcInstance = {
  title: `AT_C656281_MarcInstance_${getRandomPostfix()}`,
};

// Location data for testing effective location hierarchy
const locationData = {
  permanent: {
    institution: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
    campus: CAMPUS_NAMES.CITY_CAMPUS,
    library: LIBRARY_NAMES.DATALOGISK_INSTITUT,
    location: LOCATION_NAMES.MAIN_LIBRARY_UI,
  },
  temporary: {
    institution: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
    campus: CAMPUS_NAMES.CITY_CAMPUS,
    library: LIBRARY_NAMES.DATALOGISK_INSTITUT,
    location: LOCATION_NAMES.ANNEX_UI,
  },
};

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

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsTenantViewLocation.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
          marcInstance.id = instanceId;

          cy.getInstanceById(marcInstance.id).then((instanceData) => {
            marcInstance.hrid = instanceData.hrid;

            cy.getLocations({ query: `name="${locationData.permanent.location}"` }).then(
              (location) => {
                cy.createSimpleMarcHoldingsViaAPI(
                  marcInstance.id,
                  marcInstance.hrid,
                  location.code,
                );
              },
            );
          });
        });

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
    });

    it(
      'C656281 GetRecord: SRS - Verify that Holdings "Effective location" fields are properly included in "952" field of response (subfields "a", "b", "c", "d", "s") (firebird)',
      { tags: ['extendedPath', 'firebird', 'C656281'] },
      () => {
        // Step 1: Copy Instance UUID from the address bar
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();
        InventoryInstance.openHoldings(['']);

        // Step 2: Send OAI-PMH GetRecord request with marc21_withholdings
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          // Step 3: Verify 952 field subfields with permanent location (effective location)
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: locationData.permanent.institution,
              b: locationData.permanent.campus,
              c: locationData.permanent.library,
              d: locationData.permanent.location,
              s: locationData.permanent.location,
            },
          );
        });

        // Step 4: Click "View holdings" button => Click "Actions" button => Click "Edit"
        cy.getUserToken(user.username, user.password);
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.edit();

        // Step 5-8: Add temporary location via UI
        HoldingsRecordEdit.selectTemporaryLocation(locationData.temporary.location);
        HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
        HoldingsRecordView.checkHoldingRecordViewOpened();

        // Step 9: Close holdings window
        HoldingsRecordView.close();

        // Step 10: Send the same OAI-PMH GetRecord request again
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          // Step 11: Verify 952 field subfields with temporary location (now effective location)
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: locationData.temporary.institution,
              b: locationData.temporary.campus,
              c: locationData.temporary.library,
              d: locationData.temporary.location,
              s: locationData.temporary.location,
            },
          );
        });
      },
    );
  });
});
