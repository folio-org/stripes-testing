import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import DateTools from '../../../support/utils/dateTools';

let user;
let marcInstanceId;
let folioInstanceId;
let fromDate;
const marcFile = {
  marc: 'marcBibFileForC375988.mrc',
  fileNameImported: `testMarcBibFileC375988.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};
const folioInstance = {
  title: `AT_C375988_FolioInstance_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();

      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );
      fromDate = DateTools.getCurrentDateForOaiPmh();

      // Step 1-7: Import MARC instance via Data Import
      DataImport.uploadFileViaApi(...Object.values(marcFile)).then((response) => {
        marcInstanceId = response[0].instance.id;
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.moduleDataImportEnabled.gui,
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
      InventoryInstance.deleteInstanceViaApi(marcInstanceId);
      InventoryInstance.deleteInstanceViaApi(folioInstanceId);
      Users.deleteViaApi(user.userId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375988 verb=ListIdentifiers: Verify that added Instances MARC and FOLIO are retrieved (marc21) (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C375988', 'nonParallel'] },
      () => {
        // Step 8: Go to Inventory app → Select Actions → Select "+New" button
        const InventoryNewInstance = InventoryInstances.addNewInventory();

        // Step 9: Fill in "Resource title*" field with Instance's title
        // Step 10: Select from "Resource type*" dropdown
        InventoryNewInstance.fillRequiredValues(folioInstance.title);

        // Step 11: Click "Save and close" button
        InventoryNewInstance.clickSaveAndCloseButton();
        InventoryInstance.waitLoading();

        // Capture FOLIO instance ID from URL
        cy.location('pathname').then((pathname) => {
          folioInstanceId = pathname.split('/').pop().split('?')[0];

          // Step 12: Send ListIdentifiers request with marc21 metadata format
          cy.getAdminToken();
          const untilDate = DateTools.getCurrentDateForOaiPmh(1);

          OaiPmh.listIdentifiersRequest('marc21', fromDate, untilDate).then((response) => {
            // Verify both MARC and FOLIO instances appear in response
            OaiPmh.verifyIdentifierInListResponse(response, marcInstanceId);
            OaiPmh.verifyIdentifierInListResponse(response, folioInstanceId);
          });
        });
      },
    );
  });
});
