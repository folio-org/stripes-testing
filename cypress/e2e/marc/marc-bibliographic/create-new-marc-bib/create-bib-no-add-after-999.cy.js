import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        user: {},
        tags: {
          ldr: 'LDR',
          field001: '001',
          field005: '005',
          field008: '008',
          field035: '035',
          field245: '245',
          field999: '999',
        },
        indexes: {
          for008: 3,
          for245: 5,
        },
      };

      const fieldsWithoutAddButton = [
        testData.tags.ldr,
        testData.tags.field001,
        testData.tags.field005,
        testData.tags.field999,
      ];

      const fieldsWithAddButton = {
        initial: [testData.tags.field008, testData.tags.field245],
        afterAdding035: [testData.tags.field008, testData.tags.field035, testData.tags.field245],
      };

      const newFieldData = {
        tag: testData.tags.field035,
        content: '$a n123',
        indexAfter008: 4,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C422122 User cannot add a new field below "999 ff" field on "Create a new MARC bib record" pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C422122'] },
        () => {
          // Step 1: Click on "Actions" button → Select "+ New MARC bibliographic record" option
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();

          fieldsWithoutAddButton.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, false);
          });
          fieldsWithAddButton.initial.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, true);
          });

          // Step 2: Add new field by clicking on "+" icon next to "008" field
          QuickMarcEditor.addEmptyFields(testData.indexes.for008);
          QuickMarcEditor.addValuesToExistingField(
            testData.indexes.for008,
            newFieldData.tag,
            newFieldData.content,
          );

          fieldsWithoutAddButton.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, false);
          });

          fieldsWithAddButton.afterAdding035.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, true);
          });

          // Step 3: Click on "Add a new field" icon next to "245" field
          QuickMarcEditor.addEmptyFields(testData.indexes.for245);

          QuickMarcEditor.verifyTagValue(testData.indexes.for245, testData.tags.field245);
          QuickMarcEditor.verifyTagValue(testData.indexes.for245 + 1, '');
          QuickMarcEditor.verifyTagValue(testData.indexes.for245 + 2, testData.tags.field999);
        },
      );
    });
  });
});
