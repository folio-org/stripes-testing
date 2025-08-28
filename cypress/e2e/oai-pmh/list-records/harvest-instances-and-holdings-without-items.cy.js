import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import getRandomPostfix from '../../../support/utils/stringTools';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileManager from '../../../support/utils/fileManager';
import {
  LOCATION_NAMES,
  CAMPUS_NAMES,
  INSTITUTION_NAMES,
  LIBRARY_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
} from '../../../support/constants';

const marcInstance = {
  title: `AT_C345417_MarcInstance_${getRandomPostfix()}`,
};
const marcHoldingsFile = {
  marc: 'marcBibHoldingForC345417.mrc',
  fileNameImported: `testMarcHoldingsFileC345417.${getRandomPostfix()}.mrc`,
  editedFileName: `testMarcFileC345417${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_HOLDINGS_AND_SRS,
};
const holdingsData = {
  callNumber: 'Holdings call number',
  callNumberPrefix: 'Holdings call number prefix',
  callNumberSuffix: 'Holdings call number suffix',
  callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
};
const locationData = {
  institution: INSTITUTION_NAMES.KOBENHAVNS_UNIVERSITET,
  campus: CAMPUS_NAMES.CITY_CAMPUS,
  library: LIBRARY_NAMES.DATALOGISK_INSTITUT,
  location: LOCATION_NAMES.MAIN_LIBRARY_UI,
};

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

      cy.createSimpleMarcBibViaAPI(marcInstance.title).then((instanceId) => {
        marcInstance.id = instanceId;

        cy.getInstanceById(marcInstance.id)
          .then((instanceData) => {
            marcInstance.hrid = instanceData.hrid;

            DataImport.editMarcFile(
              marcHoldingsFile.marc,
              marcHoldingsFile.editedFileName,
              ['in00000000001'],
              [marcInstance.hrid],
            );
          })
          .then(() => {
            DataImport.uploadFileViaApi(
              marcHoldingsFile.editedFileName,
              marcHoldingsFile.fileNameImported,
              marcHoldingsFile.jobProfileToRun,
            ).then((response) => {
              marcInstance.holdingsId = response[0].holding.id;
            });
          });
      });
    });

    after('delete test data', () => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
      FileManager.deleteFile(`cypress/fixtures/${marcHoldingsFile.editedFileName}`);
    });

    it(
      'C345417 ListRecords: Harvest instances and holdings without items (firebird)',
      { tags: ['criticalPath', 'firebird', 'C345417'] },
      () => {
        OaiPmh.listRecordsRequest('marc21_withholdings').then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '952',
            { ind1: 'f', ind2: 'f' },
            {
              a: locationData.institution,
              b: locationData.campus,
              c: locationData.library,
              d: locationData.location,
              e: holdingsData.callNumber,
              f: holdingsData.callNumberPrefix,
              g: holdingsData.callNumberSuffix,
              t: '0',
            },
          );
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            {
              t: '0',
              i: marcInstance.id,
            },
          );
        });
      },
    );
  });
});
