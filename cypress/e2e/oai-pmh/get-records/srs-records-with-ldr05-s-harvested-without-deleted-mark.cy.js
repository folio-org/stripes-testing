import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import DataImport from '../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';

const marcFile = {
  marc: 'marcBibFileForC376963.mrc',
  fileName: `testMarcFileC376963.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};
const marcInstance = {};

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

      DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfileToRun).then(
        (response) => {
          response.forEach((record) => {
            marcInstance.id = record.instance.id;
          });
        },
      );
    });

    after('delete test data', () => {
      InventoryInstance.deleteInstanceViaApi(marcInstance.id);
    });

    it(
      'C376963 GetRecord: Verify that SRS records with LDR05 set to "s" are harvested without "deleted" mark (firebird)',
      { tags: ['extendedPath', 'firebird', 'C376963'] },
      () => {
        // Send OAI-PMH GetRecord request with marc21 metadata prefix
        cy.getAdminToken();
        OaiPmh.getRecordRequest(marcInstance.id).then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: marcInstance.id },
          );
          // Verify the header status is NOT set to "deleted" (status attribute should be absent)
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, false, true);
        });
      },
    );
  });
});
