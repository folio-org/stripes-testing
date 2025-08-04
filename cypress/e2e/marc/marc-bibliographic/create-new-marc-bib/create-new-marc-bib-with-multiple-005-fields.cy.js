import { Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tags: {
          tag245: '245',
          tag005: '005',
        },
        fieldContents: {
          tag245Content: 'New important book',
          tag005Content: '20240804120000.0',
        },
        tag005ValueInSourceMask: /\d{14}\.\d/,
      };
      let instanceId;

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      it(
        'C496208 Add multiple 005s when creating "MARC Bibliographic" record (Spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C496208'] },
        () => {
          InventoryInstance.newMarcBibRecord();

          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(
            testData.tags.tag245,
            testData.fieldContents.tag245Content,
          );
          QuickMarcEditor.updateIndicatorValue(testData.tags.tag245, '1', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tags.tag245, '1', 1);
          QuickMarcEditor.verifySaveAndCloseButtonEnabled();

          QuickMarcEditor.deleteValuesIn008Boxes();

          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.checkEmptyFieldAdded(5);

          QuickMarcEditor.updateExistingField('', testData.fieldContents.tag005Content);

          QuickMarcEditor.updateTagNameToLockedTag(5, testData.tags.tag005);
          QuickMarcEditor.checkFourthBoxEditable(5, false);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.getId().then((id) => {
            instanceId = id;
          });
          InventoryInstance.waitInstanceRecordViewOpened(testData.fieldContents.tag245Content);
          InventoryInstance.waitLoading();

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyNoDuplicatedFieldsWithTag(testData.tags.tag005);
          QuickMarcEditor.verifyNoFieldWithContent(testData.fieldContents.tag005Content);
          QuickMarcEditor.check008FieldContent();
        },
      );
    });
  });
});
