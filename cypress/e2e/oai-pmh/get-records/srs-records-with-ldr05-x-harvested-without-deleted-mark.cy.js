import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import DataImport from '../../../support/fragments/data_import/dataImport';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';

const marcFile = {
  marc: 'marcBibFileForC376968.mrc',
  fileName: `testMarcFileC376968.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};
const marcInstance = {};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

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
      'C376968 GetRecord: Verify that SRS records with LDR05 set to "x" are harvested without "deleted" mark (firebird)',
      { tags: ['extendedPath', 'firebird', 'C376968'] },
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
