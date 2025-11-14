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
        tag245: '245',
        firstTagRow: ['100', '140', '140', '110', '101', '101', '100', '140'],
        secondTagRow: ['110', '140', '150', '150', '101', '109', '109', '109'],
        field245Content: '$a C515003 Create MARC bib with multiple 1xx',
        field1XXOne: '$a C515003 1XX field one',
        field1XXTwo: '$a C515003 1XX field two',
        expectedErrorMessage: 'Field 1XX is non-repeatable.',
        expectedNonRepeatableError: 'Field is non-repeatable.',
        expectedUndefinedError: 'Field is undefined.',
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
          }, 20_000);
        });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        if (instanceId) {
          InventoryInstance.deleteInstanceViaApi(instanceId);
        }
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C515003 Cannot create MARC bib record with multiple 1XX fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C515003'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.updateExistingField(testData.tag245, testData.field245Content);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 1);

          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.addEmptyFields(5);
          cy.wait(1000);
          QuickMarcEditor.addValuesToExistingField(4, '100', testData.field1XXOne, '1');
          QuickMarcEditor.addValuesToExistingField(5, '100', testData.field1XXTwo, '1');
          QuickMarcEditor.pressSaveAndCloseButton();

          QuickMarcEditor.checkErrorMessage(5, testData.expectedErrorMessage);
          QuickMarcEditor.checkErrorMessage(6, testData.expectedErrorMessage);

          testData.firstTagRow.forEach((firstTag, index) => {
            const secondTag = testData.secondTagRow[index];

            QuickMarcEditor.updateExistingTagValue(5, firstTag);
            QuickMarcEditor.updateExistingTagValue(6, secondTag);

            QuickMarcEditor.pressSaveAndCloseButton();

            QuickMarcEditor.checkErrorMessage(5, testData.expectedErrorMessage);
            QuickMarcEditor.checkErrorMessage(6, testData.expectedErrorMessage);

            QuickMarcEditor.closeAllCallouts();
          });

          QuickMarcEditor.deleteField(5);

          QuickMarcEditor.pressSaveAndClose();
          InventoryInstances.waitContentLoading();
          InventoryInstance.getId().then((id) => {
            instanceId = id;
          });
        },
      );
    });
  });
});
