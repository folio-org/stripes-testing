import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

const marcInstance = { title: `AT_C411725_MarcInstance_${getRandomPostfix()}` };
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '022',
    content: '$l Linking ISSN',
    indicators: ['\\', '\\'],
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
];

describe('OAI-PMH', () => {
  describe('List records', () => {
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
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(marcInstance.id);
    });

    it(
      'C411725 ListRecords: SRS: Verify that "Linking ISSN" is mapped as "022$l" (firebird)',
      { tags: ['extendedPath', 'firebird', 'C411725'] },
      () => {
        OaiPmh.listRecordsRequest().then((response) => {
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, false, true);
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '022',
            { ind1: ' ', ind2: ' ' },
            { l: 'Linking ISSN' },
          );
        });
        OaiPmh.listRecordsRequest('marc21_withholdings').then((response) => {
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, false, true);
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '022',
            { ind1: ' ', ind2: ' ' },
            { l: 'Linking ISSN' },
          );
        });
      },
    );
  });
});
