import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
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
      Behavior.updateBehaviorConfigViaApi(
        BEHAVIOR_SETTINGS_OPTIONS_API.SUPPRESSED_RECORDS_PROCESSING.TRUE,
        BEHAVIOR_SETTINGS_OPTIONS_API.RECORD_SOURCE.SOURCE_RECORD_STORAGE,
        BEHAVIOR_SETTINGS_OPTIONS_API.DELETED_RECORDS_SUPPORT.PERSISTENT,
        BEHAVIOR_SETTINGS_OPTIONS_API.ERRORS_PROCESSING.OK_200,
      );

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
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '999',
            { ind1: 'f', ind2: 'f' },
            { i: marcInstance.id },
          );
          OaiPmh.verifyMarcField(
            response,
            marcInstance.id,
            '245',
            { ind1: '1', ind2: '0' },
            { a: marcInstance.title },
          );
        });
      },
    );
  });
});
