import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        title: `AT_C423481_MarcBibInstance_${getRandomPostfix()}`,
        userProperties: {},
        tagLDR: 'LDR',
        tag001: '001',
        tag005: '005',
        tag008: '008',
        tag245: '245',
        tag100: '100',
        tag600: '600',
        tag610: '610',
        tag611: '611',
        tag700: '700',
        tag999: '999',
      };

      const marcInstanceFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.title}`,
          indicators: ['1', '1'],
        },
        {
          tag: testData.tag600,
          content: '$a Test600',
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag610,
          content: '$a Test610',
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag611,
          content: '$a Test611',
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag700,
          content: '$a Test700 A',
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag700,
          content: '$a Test700 B',
          indicators: ['\\', '\\'],
        },
      ];
      // Expected field states after each edit operation based on TestRail C423481 steps
      const newFieldValues = {
        // After adding 3 new fields (Step 2)
        afterAddingFields: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
        ],
        // After deleting "$a" from one field (Step 3)
        afterDeletingContent: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
        ],
        // After filling indicators and deleting content (Step 4)
        afterFillingIndicators: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '1', ind2: '2', content: '' },
        ],
      };
      const existingFieldValues = {
        // After clearing all boxes in existing field (Step 5)
        afterClearingExisting: [{ tag: '', ind1: '', ind2: '', content: '' }],
        // After updating field with indicators and $a (Step 6)
        afterIndicatorsWithContent: [{ tag: '', ind1: '\\', ind2: '\\', content: '$a ' }],
        // After updating field with numeric indicators and $a (Step 7)
        afterNumericIndicators: [{ tag: '', ind1: '2', ind2: '2', content: '$a ' }],
        // After keeping tag with indicators and $a (Step 8)
        afterKeepingTag: [{ tag: testData.tag700, ind1: '2', ind2: '2', content: '$a ' }],
        // After keeping tag but clearing content (Step 9)
        afterClearingTagContent: [{ tag: testData.tag700, ind1: '\\', ind2: '\\', content: '' }],
      };

      let createdInstanceId;

      before('Create test user and instance', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            createdInstanceId = instanceId;
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      });

      it(
        'C423481 Fields without tag and subfield values are deleted during saving (edit MARC bibliographic) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423481'] },
        () => {
          // Step 1: Navigate to instance and open MARC bib editor
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitInventoryLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateLDR06And07Positions();

          // Step 2: Add three new fields by clicking on the "+" icon
          for (let i = 0; i < 3; i++) {
            QuickMarcEditor.addEmptyFields(9 + i);
          }
          cy.wait(1000);

          // Verify three new fields are added with expected format
          newFieldValues.afterAddingFields.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              10 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          // Step 3: Delete "$a" value from one of the added fields (middle field)
          QuickMarcEditor.addValuesToExistingField(10, '', '');
          newFieldValues.afterDeletingContent.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              10 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          // Step 4: Fill in indicator boxes of one field and delete "$a" value from same field
          QuickMarcEditor.addValuesToExistingField(11, '', '', '1', '2');
          newFieldValues.afterFillingIndicators.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              10 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          // Step 5: Clear all boxes in an existing (saved) field (not 245 field)
          QuickMarcEditor.addValuesToExistingField(4, '', '', '', '');
          existingFieldValues.afterClearingExisting.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              5 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          // Step 6: Update existing field - clear tag, set indicators to \, keep $a
          QuickMarcEditor.addValuesToExistingField(5, '', '$a ', '\\', '\\');
          existingFieldValues.afterIndicatorsWithContent.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              6 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          // Step 7: Update existing field - clear tag, set indicators to 2, keep $a
          QuickMarcEditor.addValuesToExistingField(6, '', '$a ', '2', '2');
          existingFieldValues.afterNumericIndicators.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              7 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          // Step 8: Update existing field - keep tag (700), set indicators to 2, keep $a only
          QuickMarcEditor.addValuesToExistingField(7, '700', '$a ', '2', '2');
          existingFieldValues.afterKeepingTag.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              8 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          // Step 9: Update existing field - keep tag (700), delete all content including $a
          QuickMarcEditor.addValuesToExistingField(8, '700', '', '\\', '\\');
          existingFieldValues.afterClearingTagContent.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              9 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          // Step 10: Click "Save & keep editing" button
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.waitLoading();

          // Verify that the 3 added fields and 5 edited fields are deleted
          // Should be back to original field count (LDR, 001, 005, 008, 245, 999)
          QuickMarcEditor.checkFieldsCount(6);

          // Verify remaining fields are the core MARC fields
          [
            testData.tagLDR,
            testData.tag001,
            testData.tag005,
            testData.tag008,
            testData.tag245,
            testData.tag999,
          ].forEach((tag, index) => {
            QuickMarcEditor.verifyTagValue(index, tag);
          });
        },
      );
    });
  });
});
