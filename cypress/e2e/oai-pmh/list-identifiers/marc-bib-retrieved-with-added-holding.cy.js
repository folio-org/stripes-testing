import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import FileManager from '../../../support/utils/fileManager';
import DateTools from '../../../support/utils/dateTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

let holdingsAddedTimestamp;
const marcInstance = { title: `AT_C375132_MarcInstance_${getRandomPostfix()}` };
const marcHoldingsFile = {
  marc: 'oneMarcHolding.mrc',
  fileNameImported: `testMarcHoldingsFileC375132.${getRandomPostfix()}.mrc`,
  editedFileName: `testMarcFileC375132${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
};

describe('OAI-PMH', () => {
  describe('List identifiers', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

      cy.createSimpleMarcBibViaAPI(marcInstance.title)
        .then((instanceId) => {
          marcInstance.id = instanceId;

          cy.getInstanceById(marcInstance.id).then((instanceData) => {
            marcInstance.hrid = instanceData.hrid;

            // For clear test results, it is necessary to wait to ensure that
            // adding holding is treated as an update to the Instance record
            cy.wait(60_000);

            DataImport.editMarcFile(
              marcHoldingsFile.marc,
              marcHoldingsFile.editedFileName,
              ['oo10000000000'],
              [marcInstance.hrid],
            );
          });
        })
        .then(() => {
          // Capture timestamp before adding holdings
          holdingsAddedTimestamp = DateTools.getCurrentDateForOaiPmh();

          DataImport.uploadFileViaApi(
            marcHoldingsFile.editedFileName,
            marcHoldingsFile.fileNameImported,
            marcHoldingsFile.jobProfileToRun,
          );
        });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      FileManager.deleteFile(`cypress/fixtures/${marcHoldingsFile.editedFileName}`);
    });

    it(
      'C375132 verb=ListIdentifiers: Verify that MARC BIB is retrieved in case added Holding MARC to it (marc21_withholdings) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375132'] },
      () => {
        OaiPmh.listIdentifiersRequest('marc21_withholdings', holdingsAddedTimestamp).then(
          (response) => {
            OaiPmh.verifyIdentifierInListResponse(response, marcInstance.id);
          },
        );
      },
    );
  });
});
