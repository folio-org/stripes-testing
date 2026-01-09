import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';

let marcInstanceId;
const marcFile = {
  marc: 'marcBibFileForC375181.mrc',
  fileNameImported: `testMarcFileC375184.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
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

      DataImport.uploadFileViaApi(...Object.values(marcFile)).then((response) => {
        marcInstanceId = response[0].instance.id;
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(marcInstanceId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375184 NEGATIVE: GetRecord: Verify that MARC instances are not retrieved in responce (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375184', 'nonParallel'] },
      () => {
        OaiPmh.getRecordRequest(marcInstanceId).then((response) => {
          OaiPmh.verifyIdDoesNotExistError(response);
        });
      },
    );
  });
});
