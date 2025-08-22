import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';

let marcInstanceId;
const marcFile = {
  marc: 'marcBibFileForC375181.mrc',
  fileNameImported: `testMarcFileC375181.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

      DataImport.uploadFileViaApi(...Object.values(marcFile)).then((response) => {
        marcInstanceId = response[0].instance.id;
      });
    });

    after('delete test data', () => {
      InventoryInstance.deleteInstanceViaApi(marcInstanceId);
    });

    it(
      'C375181 GetRecord: Verify that MARC instances are retrieved in response (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375181'] },
      () => {
        OaiPmh.getRecordRequest(marcInstanceId).then((response) => {
          OaiPmh.verifyMarcField(
            response,
            '999',
            { ind1: 'f', ind2: 'f' },
            { t: '0', i: marcInstanceId },
          );
        });
      },
    );
  });
});
