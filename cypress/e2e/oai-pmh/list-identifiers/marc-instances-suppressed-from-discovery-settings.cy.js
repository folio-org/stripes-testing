import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../support/constants';
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
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import DateTools from '../../../support/utils/dateTools';
import InteractorsTools from '../../../support/utils/interactorsTools';

let user;
let currentDate;
const marcInstance = {};
const marcBibFile = {
  marc: 'marcBibFileForC375302.mrc',
  fileNameImported: `testMarcBibFileC375302.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      currentDate = DateTools.getCurrentDateForOaiPmh();
      DataImport.uploadFileViaApi(...Object.values(marcBibFile)).then((response) => {
        marcInstance.id = response[0].instance.id;
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.oaipmhSettingsEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375302 ListIdentifiers: Verify MARC instances suppressed from discovery settings (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C375302', 'nonParallel'] },
      () => {
        // Step 1-5: Search for imported instance
        InventorySearchAndFilter.searchInstanceByTitle(marcInstance.id);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 6-7: Edit instance and suppress from discovery
        InstanceRecordView.edit();
        InstanceRecordEdit.waitLoading();
        InstanceRecordEdit.clickDiscoverySuppressCheckbox();
        InstanceRecordEdit.saveAndClose();
        InstanceRecordView.waitLoading();
        InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryWarning();

        // Step 8-9: View source and note UUID (UUID already in marcInstance.id)
        // Step 10: Send OAI-PMH ListIdentifiers request with "Transfer suppressed records" setting
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21', currentDate).then((response) => {
          OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, true);
        });

        // Step 11: Change setting to "Skip suppressed from discovery records"
        cy.getUserToken(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'OAI-PMH');
        OaiPmhPane.selectSection(SECTIONS.BEHAVIOR);
        Behavior.pickSuppressedRecordsProcessing(
          BEHAVIOR_SETTINGS_OPTIONS_UI.SUPPRESSED_RECORDS_PROCESSING.SKIP,
        );
        Behavior.clickSave();
        InteractorsTools.checkCalloutMessage('Setting was successfully updated.');

        // Step 12: Send OAI-PMH request again - verify suppressed record is NOT present
        cy.getAdminToken();
        OaiPmh.listIdentifiersRequest('marc21', currentDate).then((response) => {
          OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id, false);
        });
      },
    );
  });
});
