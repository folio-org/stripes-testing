import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';

let marcInstanceId;
const marcFile = {
  marc: 'oneMarcBib.mrc',
  fileNameImported: `testMarcFileC375185.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
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

      DataImport.uploadFileViaApi(...Object.values(marcFile))
        .then((response) => {
          marcInstanceId = response[0].instance.id;
        })
        .then(() => {
          cy.getInstanceById(marcInstanceId).then((instanceData) => {
            instanceData.discoverySuppress = true;
            cy.updateInstance(instanceData);
          });
        });
    });

    after('delete test data', () => {
      InventoryInstance.deleteInstanceViaApi(marcInstanceId);
    });

    it(
      'C375185 GetRecord: Verify MARC instances suppressed from discovery in case Transfer suppressed records with discovery flag (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375185'] },
      () => {
        OaiPmh.getRecordRequest(marcInstanceId).then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstanceId,
            '999',
            { ind1: 'f', ind2: 'f' },
            { t: '1', i: marcInstanceId },
          );
        });
      },
    );
  });
});
