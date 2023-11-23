import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import InventoryKeyboardShortcuts from '../../support/fragments/inventory/inventoryKeyboardShortcuts';

describe('Create new MARC bib', () => {
  const testData = {
    marcBibTitle: 'The title: the face of a record',
    marcBibTitle2: 'Another title',
    positions: [5, 6, 7, 8, 18, 19],
    validLDRValue: '00000naa\\a2200000uu\\4500',
    invalidLDRvalue: '000001b!ba2200000u$f4500',
    fieldValues: [
      { tag: '035', content: '$a test1' },
      { tag: '240', content: '$a test2 $a test3 $a test4' },
      { tag: '300', content: '$a test5 $a test6' },
    ],
  };
  const firstEditableRow = 4;
  const lastEditableRow = 7;
  const lastRow = 8;

  before('Create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C380717 Verify focus behavior when using field level action icons upon creation of a new "MARC bib" record (spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      // Open New Marc Bibliographic record editor
      InventoryInstance.newMarcBibRecord();

      // Add new fields
      testData.fieldValues.forEach(({ tag, content }, index) => {
        const rowIndex = firstEditableRow + index;
        QuickMarcEditor.addNewField(tag, content, rowIndex);
        QuickMarcEditor.verifyEditableFieldIcons(rowIndex + 1);
      });
      QuickMarcEditor.waitLoading();

      // Move field up
      QuickMarcEditor.moveFieldUp(lastEditableRow);
      for (let i = lastEditableRow - 1; i > firstEditableRow; i--) {
        QuickMarcEditor.verifyAfterMovingFieldUp(
          i,
          testData.fieldValues[2].tag,
          testData.fieldValues[2].content,
        );
        QuickMarcEditor.moveFieldUpWithEnter(i);
      }
      QuickMarcEditor.verifyAfterMovingFieldUpFirstEditableRow(
        4,
        testData.fieldValues[2].tag,
        testData.fieldValues[2].content,
      );

      // Move field down
      QuickMarcEditor.clickArrowDownButton(firstEditableRow);
      for (let i = firstEditableRow + 1; i < lastRow; i++) {
        QuickMarcEditor.verifyAfterMovingFieldDown(
          i,
          testData.fieldValues[2].tag,
          testData.fieldValues[2].content,
        );
        QuickMarcEditor.moveFieldDownWithEnter(i);
      }
      QuickMarcEditor.verifyAfterMovingFieldDownLastEditableRow(
        lastRow,
        testData.fieldValues[2].tag,
        testData.fieldValues[2].content,
      );

      // Check text field focus by pressing Tab
      QuickMarcEditor.addEmptyFields(4);
      QuickMarcEditor.verifyTagBoxIsFocused(5);
      QuickMarcEditor.movetoFourthBoxUsingTab(5);

      // Delete fields
      QuickMarcEditor.deleteField(5);
      cy.wait(100);
      QuickMarcEditor.deleteFieldWithEnter(5);
      QuickMarcEditor.checkAfterDeleteField('035');
      QuickMarcEditor.deleteField(5);
      QuickMarcEditor.checkAfterDeleteLastEditableField('240');

      // Add empty field and check that tag box is focused
      QuickMarcEditor.addEmptyFields(5);
      QuickMarcEditor.verifyTagBoxIsFocused(6);
      QuickMarcEditor.deleteField(6);

      // move cursor between subfields of the same field
      QuickMarcEditor.moveCursorToTagBox(6);
      QuickMarcEditor.movetoFourthBoxUsingTab(6);
      InventoryKeyboardShortcuts.moveCursorBetweenSubfieldsAndCheck(6);
    },
  );
});
