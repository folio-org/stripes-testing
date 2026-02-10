import { APPLICATION_NAMES } from '../../../support/constants';
import { Behavior, OaiPmh as OaiPmhPane } from '../../../support/fragments/settings/oai-pmh';
import {
  BEHAVIOR_SETTINGS_OPTIONS_API,
  BEHAVIOR_SETTINGS_OPTIONS_UI,
} from '../../../support/fragments/settings/oai-pmh/behavior';
import { SECTIONS } from '../../../support/fragments/settings/oai-pmh/oaipmhPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import DateTools from '../../../support/utils/dateTools';
import InteractorsTools from '../../../support/utils/interactorsTools';

let user;
let currentDate;
const folioInstance = {
  title: `AT_C375303_FolioInstance_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      currentDate = DateTools.getCurrentDateForOaiPmh();

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        cy.getLocations({ limit: 1 }).then((res) => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: instanceTypes[0].id,
              title: folioInstance.title,
            },
            holdings: [
              {
                permanentLocationId: res.id,
              },
            ],
          }).then((instanceData) => {
            folioInstance.id = instanceData.instanceId;
          });
        });
      });

      cy.createTempUser([Permissions.inventoryAll.gui, Permissions.oaipmhSettingsEdit.gui]).then(
        (userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventorySearchAndFilter.waitLoading,
          });
        },
      );
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375303 ListIdentifiers: Verify Instance FOLIO suppressed from discovery settings (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C375303', 'nonParallel'] },
      () => {
        // Step 1-2: Search for FOLIO instance
        InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 3-5: Edit instance and suppress from discovery
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.clickDiscoverySuppressCheckbox();
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();

        // Step 6: Send OAI-PMH ListIdentifiers request with "Transfer suppressed records" setting
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', currentDate).then((response) => {
          OaiPmh.verifyIdentifierInListResponse(response, folioInstance.id, true);
        });

        // Step 7: Change setting to "Skip suppressed from discovery records"
        cy.getUserToken(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'OAI-PMH');
        OaiPmhPane.selectSection(SECTIONS.BEHAVIOR);
        Behavior.pickSuppressedRecordsProcessing(
          BEHAVIOR_SETTINGS_OPTIONS_UI.SUPPRESSED_RECORDS_PROCESSING.SKIP,
        );
        Behavior.clickSave();
        InteractorsTools.checkCalloutMessage('Setting was successfully updated.');

        // Step 8: Send OAI-PMH request again - verify suppressed record is NOT present
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21_withholdings', currentDate).then((response) => {
          OaiPmh.verifyIdentifierInListResponse(response, folioInstance.id, false);
        });
      },
    );
  });
});
