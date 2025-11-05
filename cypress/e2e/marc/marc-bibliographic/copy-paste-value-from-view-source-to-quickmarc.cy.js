import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      titlePrefix: `AT_C422157_MarcBibInstance_${randomPostfix}`,
      tag260Content: `$a AT_C422157_Field260_${randomPostfix}`,
      tags: {
        tag008: '008',
        tag245: '245',
        tag260: '260',
      },
      userProperties: {},
    };

    const marcInstanceAFields = [
      {
        tag: testData.tags.tag008,
        content: QuickMarcEditor.defaultValid008Values,
      },
      {
        tag: testData.tags.tag245,
        content: `$a ${testData.titlePrefix} A`,
        indicators: ['1', '1'],
      },
      {
        tag: testData.tags.tag260,
        content: testData.tag260Content,
        indicators: ['\\', '\\'],
      },
    ];

    const marcInstanceBFields = [
      {
        tag: testData.tags.tag008,
        content: QuickMarcEditor.defaultValid008Values,
      },
      {
        tag: testData.tags.tag245,
        content: `$a ${testData.titlePrefix} B`,
        indicators: ['1', '1'],
      },
    ];

    const createdInstanceIds = [];

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.then(() => {
          [marcInstanceAFields, marcInstanceBFields].forEach((fields) => {
            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, fields).then(
              (instanceId) => {
                createdInstanceIds.push(instanceId);
              },
            );
          });
        }).then(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdInstanceIds.forEach((id) => {
        InventoryInstance.deleteInstanceViaApi(id);
      });
    });

    it(
      'C422157 Copy and paste from the MARC source view of the record to editing window of "MARC bibliographic" record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422157'] },
      () => {
        let textFromSource;

        InventoryInstances.searchByTitle(createdInstanceIds[0]);
        InventoryInstances.selectInstanceById(createdInstanceIds[0]);
        InventoryInstance.waitInventoryLoading();
        InventoryInstance.viewSource();

        InventoryViewSource.contains(testData.tag260Content);

        InventoryViewSource.getContentFromRow(5).then((copiedText) => {
          textFromSource = `$${copiedText.split('$')[1]}`;

          InventoryViewSource.close();

          InventoryInstances.searchByTitle(createdInstanceIds[1]);
          InventoryInstances.selectInstanceById(createdInstanceIds[1]);
          InventoryInstance.waitInventoryLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.addNewField(testData.tags.tag260, textFromSource, 4);
          QuickMarcEditor.checkContentByTag(testData.tags.tag260, textFromSource);

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.checkContentByTag(testData.tags.tag260, textFromSource);
        });
      },
    );
  });
});
