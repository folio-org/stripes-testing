import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryKeyboardShortcuts from '../../../../support/fragments/inventory/inventoryKeyboardShortcuts';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        fieldValues: [
          {
            tag: '035',
            content: '$a test1',
            isArrowUpButtonShown: true,
            isArrowDownButtonShown: true,
            rowIndex: 5,
          },
          {
            tag: '240',
            content: '$a test2 $a test3 $a test4',
            isArrowUpButtonShown: true,
            isArrowDownButtonShown: true,
            rowIndex: 6,
          },
          {
            tag: '300',
            content: '$a test5 $a test6',
            isArrowUpButtonShown: true,
            isArrowDownButtonShown: false,
            rowIndex: 7,
          },
        ],
      };
      const firstEditableRow = 4;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          }, 20_000);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C422120 Verify focus behavior when using field level action icons upon creation of a new "MARC bib" record (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire', 'C422120'] },
        () => {
          // Open New Marc Bibliographic record editor
          InventoryInstance.newMarcBibRecord();

          // Add new fields
          testData.fieldValues.forEach(({ tag, content }, index) => {
            const rowIndex = firstEditableRow + index;
            QuickMarcEditor.addNewField(tag, content, rowIndex);
          });
          testData.fieldValues.forEach(
            ({ rowIndex, isArrowUpButtonShown, isArrowDownButtonShown }) => {
              QuickMarcEditor.verifyEditableFieldIcons(
                rowIndex,
                isArrowUpButtonShown,
                isArrowDownButtonShown,
              );
            },
          );
          QuickMarcEditor.verifyEditableFieldIcons(3, false, true, false);
          QuickMarcEditor.verifyEditableFieldIcons(4, true, true, false);
          QuickMarcEditor.waitLoading();

          // Move field up
          QuickMarcEditor.moveFieldUp(6);
          QuickMarcEditor.verifyAfterMovingFieldUp(
            5,
            testData.fieldValues[1].tag,
            testData.fieldValues[1].content,
          );
          QuickMarcEditor.moveFieldUpWithEnter(5);
          QuickMarcEditor.verifyAfterMovingFieldUp(
            4,
            testData.fieldValues[1].tag,
            testData.fieldValues[1].content,
          );
          QuickMarcEditor.moveFieldUpWithEnter(4);
          QuickMarcEditor.verifyAfterMovingFieldUpFirstEditableRow(
            3,
            testData.fieldValues[1].tag,
            testData.fieldValues[1].content,
          );

          // Move field down
          QuickMarcEditor.clickArrowDownButton(3);
          QuickMarcEditor.verifyAfterMovingFieldDown(
            4,
            testData.fieldValues[1].tag,
            testData.fieldValues[1].content,
          );
          QuickMarcEditor.moveFieldDownWithEnter(4);
          QuickMarcEditor.verifyAfterMovingFieldDown(
            5,
            testData.fieldValues[1].tag,
            testData.fieldValues[1].content,
          );
          QuickMarcEditor.moveFieldDownWithEnter(5);
          QuickMarcEditor.moveFieldDownWithEnter(6);
          QuickMarcEditor.verifyAfterMovingFieldDownLastEditableRow(
            7,
            testData.fieldValues[1].tag,
            testData.fieldValues[1].content,
          );

          // Check text field focus by pressing Tab
          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.verifyTagBoxIsFocused(5);
          QuickMarcEditor.movetoFourthBoxUsingTab(5);

          // Delete fields
          QuickMarcEditor.deleteField(5);
          cy.wait(100);
          QuickMarcEditor.checkDeleteThisFieldHoverText();
          QuickMarcEditor.verifyDeleteButtonInFocus(5);
          QuickMarcEditor.deleteFieldWithEnter(5);
          QuickMarcEditor.checkAfterDeleteField(testData.fieldValues[0].tag);

          // Move cursor between subfields of the same field
          QuickMarcEditor.moveCursorToTagBox(5);
          QuickMarcEditor.movetoFourthBoxUsingTab(5);
          InventoryKeyboardShortcuts.moveCursorBetweenSubfieldsAndCheck(5);
        },
      );
    });
  });
});
