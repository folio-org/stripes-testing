import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import FileManager from '../../../support/utils/fileManager';

const marcInstance = {};
const marcBibFile = {
  marc: 'marcBibFileForC375191.mrc',
  fileNameImported: `testMarcBibFileC375191.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};
const marcHoldingsFile = {
  marc: 'oneMarcHolding.mrc',
  fileNameImported: `testMarcHoldingsFileC375191.${getRandomPostfix()}.mrc`,
  editedFileName: `testMarcFileC375191${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      DataImport.uploadFileViaApi(...Object.values(marcBibFile))
        .then((response) => {
          marcInstance.id = response[0].instance.id;

          cy.getInstanceById(marcInstance.id).then((instance) => {
            marcInstance.hrid = instance.hrid;

            DataImport.editMarcFile(
              marcHoldingsFile.marc,
              marcHoldingsFile.editedFileName,
              ['oo10000000000'],
              [marcInstance.hrid],
            );
          });
        })
        .then(() => {
          DataImport.uploadFileViaApi(
            marcHoldingsFile.editedFileName,
            marcHoldingsFile.fileNameImported,
            marcHoldingsFile.jobProfileToRun,
          ).then((response) => {
            marcInstance.holdingsId = response[0].holding.id;

            cy.getHoldings({
              limit: 1,
              query: `"id"="${marcInstance.holdingsId}"`,
            }).then((holdings) => {
              cy.updateHoldingRecord(marcInstance.holdingsId, {
                ...holdings[0],
                discoverySuppress: true,
              });
            });
          });
        });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      Behavior.updateBehaviorConfigViaApi();
      FileManager.deleteFile(`cypress/fixtures/${marcHoldingsFile.editedFileName}`);
    });

    it(
      'C375191 GetRecord: Verify MARC holdings suppressed from discovery in case Skip suppressed from discovery records (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375191', 'nonParallel'] },
      () => {
        OaiPmh.getRecordRequest(marcInstance.id, 'marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: marcInstance.id },
          );
          OaiPmh.verifyMarcFieldAbsent(response, marcInstance.id, ['856', '952']);
        });
      },
    );
  });
});
