import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import DataImport from '../../../support/fragments/data_import/dataImport';
import getRandomPostfix from '../../../support/utils/stringTools';
import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';

let marcInstanceId;
let folioInstanceId;
const marcFile = {
  marc: 'marcBibFileForC375183.mrc',
  fileNameImported: `testMarcFileC375183.${getRandomPostfix()}.mrc`,
  jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
};
const folioInstance = {
  title: `AT_C375183_FolioInstance_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE_AND_INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      DataImport.uploadFileViaApi(...Object.values(marcFile)).then((response) => {
        marcInstanceId = response[0].instance.id;
      });

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: folioInstance.title,
          },
        }).then((createdInstanceData) => {
          folioInstanceId = createdInstanceData.instanceId;
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(marcInstanceId);
      InventoryInstance.deleteInstanceViaApi(folioInstanceId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375183 GetRecord: Verify that MARC + FOLIO instances are retrieved in responce (firebird)',
      { tags: ['extendedPathFlaky', 'firebird', 'C375183', 'nonParallel'] },
      () => {
        OaiPmh.getRecordRequest(marcInstanceId).then((response) => {
          OaiPmh.verifyMarcField(
            response,
            marcInstanceId,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: marcInstanceId },
          );
          OaiPmh.verifyMarcField(
            response,
            marcInstanceId,
            '245',
            { ind1: '0', ind2: '4' },
            { a: 'AT_C375183_MarcInstance' },
          );
        });

        OaiPmh.getRecordRequest(folioInstanceId).then((response) => {
          OaiPmh.verifyMarcField(
            response,
            folioInstanceId,
            '999',
            { ind1: 'f', ind2: 'f' },
            { t: '0', i: folioInstanceId },
          );
          OaiPmh.verifyMarcField(
            response,
            folioInstanceId,
            '245',
            { ind1: '0', ind2: '0' },
            { a: folioInstance.title },
          );
        });
      },
    );
  });
});
