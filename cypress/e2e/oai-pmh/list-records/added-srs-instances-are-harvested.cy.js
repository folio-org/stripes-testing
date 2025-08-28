import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

let marcInstanceId;
const marcBibFile = {
  marc: 'oneMarcBib.mrc',
  fileNameImported: `testMarcBibFileC375970.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

      DataImport.uploadFileViaApi(...Object.values(marcBibFile)).then((response) => {
        marcInstanceId = response[0].instance.id;
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(marcInstanceId);
    });

    it(
      'C375970 ListRecords: Added SRS instances are harvested (marc21 and marc21_withholdings) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C375970'] },
      () => {
        OaiPmh.listRecordsRequest('marc21_withholdings').then((response) => {
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstanceId, false, true);
          OaiPmh.verifyMarcField(
            response,
            marcInstanceId,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: marcInstanceId },
          );
        });
        OaiPmh.listRecordsRequest().then((response) => {
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstanceId, false, true);
          OaiPmh.verifyMarcField(
            response,
            marcInstanceId,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: marcInstanceId },
          );
        });
      },
    );
  });
});
