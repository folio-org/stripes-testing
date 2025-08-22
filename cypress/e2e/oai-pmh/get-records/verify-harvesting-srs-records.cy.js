import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

const marcInstance = { title: `AT_C375965_MarcInstance_${getRandomPostfix()}` };
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
];

describe('OAI-PMH', () => {
  describe('Get records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
        (instanceId) => {
          marcInstance.id = instanceId;
        },
      );
    });

    after('delete test data', () => {
      InventoryInstance.deleteInstanceViaApi(marcInstance.id);
    });

    it(
      'C375965 GetRecord: Verify harvesting SRS records (firebird)',
      { tags: ['extendedPath', 'firebird', 'C375965'] },
      () => {
        OaiPmh.getRecordRequest(marcInstance.id).then((response) => {
          OaiPmh.verifyMarcField(response, '999', { ind1: 'f', ind2: 'f' }, { i: marcInstance.id });
          OaiPmh.verifyMarcField(
            response,
            '245',
            { ind1: '1', ind2: '0' },
            { a: marcInstance.title },
          );
        });
      },
    );
  });
});
