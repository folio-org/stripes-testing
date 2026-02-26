import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Edit MARC holdings', () => {
      const testData = {
        title: `AT_C423485_MarcBibInstance_${getRandomPostfix()}`,
        tagLdr: 'LDR',
        tag001: '001',
        tag004: '004',
        tag005: '005',
        tag008: '008',
        tag014: '014',
        tag852: '852',
        tag866: '866',
        tag868: '868',
        tag999: '999',
        tag014Content: '$a field014',
        tag866Content: '$a field866',
        tag868Content: '$a field868',
      };

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
      };

      let createdInstanceId;
      let user;

      before('Creating user, data', () => {
        cy.getAdminToken();

        cy.then(() => {
          cy.getLocations({ limit: 1, query: '(name<>"*autotest*" and name<>"AT_*")' }).then(
            (location) => {
              cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
                createdInstanceId = instanceId;
                cy.getInstanceById(instanceId).then((instanceData) => {
                  cy.createMarcHoldingsViaAPI(instanceData.id, [
                    {
                      content: instanceData.hrid,
                      tag: testData.tag004,
                    },
                    {
                      content: QuickMarcEditor.defaultValid008HoldingsValues,
                      tag: testData.tag008,
                    },
                    {
                      content: testData.tag014Content,
                      indicators: ['1', '\\'],
                      tag: testData.tag014,
                    },
                    {
                      content: `$b ${location.code}`,
                      indicators: ['0', '1'],
                      tag: testData.tag852,
                    },
                    {
                      content: testData.tag866Content,
                      indicators: ['4', '1'],
                      tag: testData.tag866,
                    },
                    {
                      content: testData.tag868Content,
                      indicators: ['4', '1'],
                      tag: testData.tag868,
                    },
                  ]);
                });
              });
            },
          );
        })
          .then(() => {
            cy.getAdminToken();
            cy.createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcHoldingsEditorView.gui,
              Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
            ]).then((userProperties) => {
              user = userProperties;
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteFullInstancesByTitleViaApi(testData.marcBibTitle);
      });

      it(
        'C423485 Fields without tag and subfield values are deleted during saving (edit MARC holdings) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423485'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitInventoryLoading();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          // Step 2: Add three new fields by clicking on the "+" icon
          for (let i = 0; i < 3; i++) {
            QuickMarcEditor.addEmptyFields(8 + i);
          }
          cy.wait(1000);

          // Verify three new fields are added with expected format
          newFieldValues.afterAddingFields.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              9 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          // Step 3: Delete "$a" value from one of the added fields (middle field)
          QuickMarcEditor.addValuesToExistingField(9, '', '');
          newFieldValues.afterDeletingContent.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              9 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          // Step 4: Fill in indicator boxes of one field and delete "$a" value from same field
          QuickMarcEditor.addValuesToExistingField(10, '', '', '1', '2');
          newFieldValues.afterFillingIndicators.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              9 + index,
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
          QuickMarcEditor.addValuesToExistingField(6, '', '$a ', '\\', '\\');
          existingFieldValues.afterIndicatorsWithContent.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              7 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          // Step 7: Update existing field - clear tag, set indicators to 2, keep $a
          QuickMarcEditor.addValuesToExistingField(7, '', '$a ', '2', '2');
          existingFieldValues.afterNumericIndicators.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              8 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          // Step 8: Click "Save & keep editing" button
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.waitLoading();

          // Verify that the 3 added fields and 3 edited fields are deleted
          // The rest of the fields remain (LDR, 001, 004, 005, 008, 852, 999)
          const remainingFields = [
            testData.tagLdr,
            testData.tag001,
            testData.tag004,
            testData.tag005,
            testData.tag008,
            testData.tag852,
            testData.tag999,
          ];
          QuickMarcEditor.checkFieldsCount(remainingFields.length);
          QuickMarcEditor.checkFieldsExist(remainingFields);
        },
      );
    });
  });
});
