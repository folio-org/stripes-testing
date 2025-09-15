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
          tag001: '001',
        },
        fieldContents: {
          tag245Content: 'New important book',
          tag001Content: '$a n 94000339',
        },
        tag001ValueInSourceMask: /[a-z]+\d+/,
      };
      let instanceId;

      before('Create test data', () => {
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

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
      });

      it(
        'C380699 Add multiple 001s when creating "MARC Bibliographic" record (Spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C380699'] },
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

          QuickMarcEditor.updateExistingField('', testData.fieldContents.tag001Content);

          QuickMarcEditor.updateTagNameToLockedTag(5, testData.tags.tag001);
          QuickMarcEditor.checkFourthBoxEditable(5, false);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.getId().then((id) => {
            instanceId = id;
          });
          InventoryInstance.waitInstanceRecordViewOpened(testData.fieldContents.tag245Content);
          InventoryInstance.waitLoading();

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyNoDuplicatedFieldsWithTag(testData.tags.tag001);
          QuickMarcEditor.checkFieldContentMatch(
            'textarea[name="records[1].content"]',
            testData.tag001ValueInSourceMask,
          );
          QuickMarcEditor.check008FieldContent();
        },
      );
    });
  });
});
