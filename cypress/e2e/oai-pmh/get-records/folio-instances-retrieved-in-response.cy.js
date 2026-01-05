import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import getRandomPostfix from '../../../support/utils/stringTools';

let folioInstanceId;
const folioInstance = {
  title: `AT_C375182_FolioInstance_${getRandomPostfix()}`,
};

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Inventory', 'persistent', '200');

      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        InventoryInstances.createFolioInstanceViaApi({
          instance: {
            instanceTypeId: instanceTypes[0].id,
            title: folioInstance.title,
          },
        }).then((createdInstanceData) => {
          folioInstanceId = createdInstanceData.instanceId;

          cy.getInstanceById(folioInstanceId).then((instanceData) => {
            folioInstance.hrid = instanceData.hrid;
          });
        });
      });
    });

    after('delete test data', () => {
      InventoryInstance.deleteInstanceViaApi(folioInstanceId);
      Behavior.updateBehaviorConfigViaApi();
    });

    it(
      'C375182 GetRecord: Verify that FOLIO instances are retrieved in response (marc21) (firebird)',
      { tags: ['extendedPath', 'firebird', 'nonParallel', 'C375182'] },
      () => {
        OaiPmh.getRecordRequest(folioInstanceId).then((response) => {
          OaiPmh.verifyMarcControlField(response, folioInstanceId, '001', folioInstance.hrid);
          OaiPmh.verifyMarcControlField(
            response,
            folioInstanceId,
            '008',
            '260105|||||||||||||||||       |||||und||',
          );
          OaiPmh.verifyMarcField(
            response,
            folioInstanceId,
            '245',
            { ind1: '0', ind2: '0' },
            { a: folioInstance.title },
          );
          OaiPmh.verifyMarcField(
            response,
            folioInstanceId,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: folioInstanceId, t: '0' },
          );
          OaiPmh.verifyOaiPmhRecordHeader(response, folioInstanceId, false, true);
        });
      },
    );
  });
});
