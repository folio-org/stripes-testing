import permissions from '../../../support/dictionary/permissions';
import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import HoldingsRecordEdit from '../../../support/fragments/inventory/holdingsRecordEdit';
import TopMenu from '../../../support/fragments/topMenu';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import FileManager from '../../../support/utils/fileManager';

let user;
const marcInstance = {};
const marcBibFile = {
  marc: 'oneMarcBib.mrc',
  fileNameImported: `testMarcBibFileC375192.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};
const marcHoldingsFile = {
  marc: 'oneMarcHolding.mrc',
  fileNameImported: `testMarcHoldingsFileC375192.${getRandomPostfix()}.mrc`,
  editedFileName: `testMarcFileC388510${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
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
        permissions.inventoryAll.gui,
        permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Import MARC Bibliographic record
        DataImport.uploadFileViaApi(...Object.values(marcBibFile))
          .then((response) => {
            marcInstance.id = response[0].instance.id;

            cy.getInstanceById(marcInstance.id).then((instance) => {
              marcInstance.hrid = instance.hrid;
              // edit marc file adding instance hrid
              DataImport.editMarcFile(
                marcHoldingsFile.marc,
                marcHoldingsFile.editedFileName,
                ['oo10000000000'],
                [marcInstance.hrid],
              );
            });
          })
          .then(() => {
            // Import MARC Holdings record
            DataImport.uploadFileViaApi(
              marcHoldingsFile.editedFileName,
              marcHoldingsFile.fileNameImported,
              marcHoldingsFile.jobProfileToRun,
            ).then((response) => {
              marcInstance.holdingsId = response[0].holding.id;
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
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
      FileManager.deleteFile(`cypress/fixtures/${marcHoldingsFile.editedFileName}`);
    });

    it(
      'C375192 GetRecord: Verify MARC holdings suppressed from discovery in case Transfer suppressed records with discovery flag value (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375192'] },
      () => {
        // Step 1: Navigate to the instance and find the holdings
        InventorySearchAndFilter.searchByParameter('Instance UUID', marcInstance.id);
        InventoryInstances.selectInstance();
        InventoryInstance.waitLoading();

        // Step 2: Click on "View holdings" button and select "Actions" > "Edit"
        InventoryInstance.openHoldingView();
        HoldingsRecordView.edit();

        // Step 3: Mark "Suppress from discovery" checkbox as active
        HoldingsRecordEdit.markAsSuppressedFromDiscovery();

        // Step 4: Click "Save and close" button
        HoldingsRecordEdit.saveAndClose();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkMarkAsSuppressedFromDiscovery();

        // Step 5: Close the Holdings detail window
        HoldingsRecordView.close();

        // Step 6-7: Send OAI-PMH GetRecord request with marc21_withholdings metadata prefix and verify
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          const marcFieldsToVerify = [
            {
              field: '856',
              indicators: { ind1: '4', ind2: '0' },
              subfields: { t: '0' },
            },
            {
              field: '856',
              indicators: { ind1: '4', ind2: '2' },
              subfields: { t: '1' },
            },
            {
              field: '952',
              indicators: { ind1: 'f', ind2: 'f' },
              subfields: { t: '1' },
            },
            {
              field: '999',
              indicators: { ind1: 'f', ind2: 'f' },
              subfields: { t: '0', i: marcInstance.id },
            },
          ];

          marcFieldsToVerify.forEach((verification) => {
            OaiPmh.verifyMarcField(
              response,
              marcInstance.id,
              verification.field,
              verification.indicators,
              verification.subfields,
            );
          });
        });
      },
    );
  });
});
