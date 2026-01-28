import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C359177_MarcBibInstance_${getRandomPostfix()}`,
        tag008: '008',
        tag245: '245',
        tag255: '255',
        tag600: '600',
        field255Content: '$a Field255 C359177',
        field600Content: '$a Subject C359177',
      };

      const fieldsToDelete = [
        { tag: testData.tag255, content: testData.field255Content, index: 5 },
        { tag: testData.tag600, content: testData.field600Content, index: 6 },
      ];

      const marcBibFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '1'],
        },
        { tag: testData.tag255, content: testData.field255Content, indicators: ['\\', '\\'] },
        { tag: testData.tag600, content: testData.field600Content, indicators: ['1', '1'] },
      ];

      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdInstanceId = instanceId;

              cy.waitForAuthRefresh(() => {
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              }, 20_000);
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C359177 MARC Bibliographic | Verify that deleted MARC Field will display at the same position after restoring (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C359177'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.updateLDR06And07Positions();

          fieldsToDelete.forEach((field) => {
            QuickMarcEditor.deleteFieldByTagAndCheck(field.tag);
            QuickMarcEditor.afterDeleteNotification(field.tag);
          });

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkDeleteModal(fieldsToDelete.length);
          QuickMarcEditor.clickRestoreDeletedField();

          fieldsToDelete.forEach((field) => {
            QuickMarcEditor.verifyTagValue(field.index, field.tag);
            QuickMarcEditor.checkContent(field.content, field.index);
          });
        },
      );
    });
  });
});
