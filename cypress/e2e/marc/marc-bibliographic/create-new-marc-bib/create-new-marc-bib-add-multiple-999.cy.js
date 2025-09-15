import Permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        field999: { tag: '999', content: '$a test123' },
        field245: { tag: '245', content: 'The most important book' },
      };
      let instanceId;

      before(() => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      it(
        'C380716 Add multiple 999s when creating "MARC Bibliographic" record (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C380716'] },
        () => {
          // Click on "Actions" button in second pane → Select "+New MARC Bib Record" option
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkEmptyContent(testData.field999.tag);

          // Fill "$a" value in "245" field
          QuickMarcEditor.updateExistingField(testData.field245.tag, testData.field245.content);
          QuickMarcEditor.updateIndicatorValue(testData.field245.tag, '1', 0);
          QuickMarcEditor.updateIndicatorValue(testData.field245.tag, '1', 1);

          // Replace blank values in LDR positions 06, 07 with valid values
          QuickMarcEditor.updateLDR06And07Positions();

          // Click on "+" icon next to any field
          QuickMarcEditor.addNewField(testData.field999.tag, testData.field999.content, 4);

          // Click "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.getId().then((id) => {
            instanceId = id;
          });

          // Click on "Actions" button in third pane → Select "Edit MARC bibliographic record" option
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          // Check that "999" field added at Step 5 is not shown
          QuickMarcEditor.verifyNoFieldWithContent(testData.field999.content);
          QuickMarcEditor.verifyTagField(5, testData.field999.tag, 'f', 'f', '$s', '$i');
          QuickMarcEditor.verifyNoDuplicatedFieldsWithTag(testData.field999.tag);
        },
      );
    });
  });
});
