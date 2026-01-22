import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import { BEHAVIOR_SETTINGS_OPTIONS_API } from '../../../support/fragments/settings/oai-pmh/behavior';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';

const marcInstance = { title: `AT_C376984_MarcInstance_${getRandomPostfix()}` };
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
      'C376984 GetRecords: SRS instances are harvested (oai_dc) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C376984'] },
      () => {
        OaiPmh.getRecordRequest(marcInstance.id, 'oai_dc').then((response) => {
          OaiPmh.verifyDublinCoreField(response, marcInstance.id, {
            title: marcInstance.title,
          });
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, false, true);
        });
      },
    );
  });
});
