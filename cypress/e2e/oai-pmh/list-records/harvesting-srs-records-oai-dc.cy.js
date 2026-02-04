import { Behavior } from '../../../support/fragments/settings/oai-pmh';
import getRandomPostfix from '../../../support/utils/stringTools';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import OaiPmh from '../../../support/fragments/oai-pmh/oaiPmh';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import Users from '../../../support/fragments/users/users';
import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';

let user;
const marcInstance = { title: `AT_C376984_MarcInstance_${getRandomPostfix()}` };
const editedTitle = `AT_C376984_MarcInstance_EditedTitle_${getRandomPostfix()}`;
const marcInstanceFields = [
  {
    tag: '008',
    content: QuickMarcEditor.defaultValid008Values,
  },
  {
    tag: '100',
    content: '$aWeber, Carl Maria von,$d1786-1826.',
    indicators: ['1', '\\'],
  },
  {
    tag: '240',
    content: '$aConcertos,$mclarinet, orchestra,$nno. 1, op. 73,$rF minor',
    indicators: ['1', '0'],
  },
  {
    tag: '245',
    content: `$a ${marcInstance.title}`,
    indicators: ['1', '0'],
  },
  {
    tag: '260',
    content: '$aNew York, N.Y. :$bRCA Victor Gold Seal,$cp1983.',
    indicators: ['\\', '\\'],
  },
  {
    tag: '300',
    content: '$a1 sound disc (43 min.) :$bdigital ;$c4 3/4 in.',
    indicators: ['\\', '\\'],
  },
  {
    tag: '336',
    content: '$a text $b txt $2 rdacontent',
    indicators: ['\\', '\\'],
  },
  {
    tag: '500',
    content: '$aCompact disc.',
    indicators: ['\\', '\\'],
  },
  {
    tag: '650',
    content: '$aConcertos (Clarinet)',
    indicators: ['\\', '0'],
  },
  {
    tag: '903',
    content: '$aMARS',
    indicators: ['\\', '\\'],
  },
];

describe('OAI-PMH', () => {
  describe('List records', () => {
    before('create test data', () => {
      cy.getAdminToken();
      Behavior.updateBehaviorConfigViaApi(true, 'Source record storage', 'persistent', '200');

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        Permissions.moduleDataImportEnabled.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            marcInstance.id = instanceId;
          },
        );
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventorySearchAndFilter.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      InventoryInstance.deleteInstanceViaApi(marcInstance.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C376986 ListRecords: SRS: Verify that changes to instances are triggering harvesting by verb=ListRecords with oai_dc (firebird)',
      { tags: ['extendedPath', 'firebird', 'C376986'] },
      () => {
        // Step 1-5: Edit instance title using QuickMARC
        InventoryInstances.searchByTitle(marcInstance.title);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.updateLDR06And07Positions();
        QuickMarcEditor.update008TextFields('Lang', 'eng');
        QuickMarcEditor.updateExistingField('245', `$a ${editedTitle}`);
        QuickMarcEditor.pressSaveAndClose();
        InventoryInstance.waitLoading();

        // Step 6: Verify OAI-PMH harvesting with updated title
        cy.getAdminToken();
        OaiPmh.listRecordsRequest('oai_dc').then((response) => {
          OaiPmh.verifyDublinCoreField(response, marcInstance.id, {
            title: editedTitle,
            creator: 'Weber, Carl Maria von,1786-1826.',
            type: 'text',
            publisher: 'New York, N.Y. :RCA Victor Gold Seal,',
            date: 'p1983.',
            language: 'eng',
            description: 'Compact disc.',
            subject: 'Concertos (Clarinet)',
            rights: 'discovery not suppressed',
          });
          OaiPmh.verifyOaiPmhRecordHeader(response, marcInstance.id, false, true);
        });
      },
    );
  });
});
