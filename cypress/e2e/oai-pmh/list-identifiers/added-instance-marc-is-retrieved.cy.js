import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

let marcInstanceId;
const marcBibFile = {
  marc: 'oneMarcBib.mrc',
  fileNameImported: `testMarcBibFileC375129.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
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
      'C375129 verb=ListIdentifiers: Verify that added Instance MARC is retrieved (marc21) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375129'] },
      () => {
        OaiPmh.listIdentifiersRequest().then((response) => {
          OaiPmh.verifyIdentifierInListResponse(response, marcInstanceId, false);
        });
      },
    );
  });
});
