import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import getRandomPostfix from '../../../support/utils/stringTools';

let folioInstanceId;
const folioInstance = {
  title: `AT_C375189_FolioInstance_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.FALSE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.INVENTORY,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: folioInstance.title,
            discoverySuppress: true,
          },
        }).then((createdInstanceData) => {
          folioInstanceId = createdInstanceData.instanceId;
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(folioInstanceId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375189 GetRecord: Verify FOLIO instances suppressed from discovery in case Skip suppressed from discovery records (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375189', 'nonParallel'] },
      () => {
        OaiPmh.getRecordRequest(folioInstanceId).then((response) => {
          OaiPmh.verifyIdDoesNotExistError(response);
        });
      },
    );
  });
});
