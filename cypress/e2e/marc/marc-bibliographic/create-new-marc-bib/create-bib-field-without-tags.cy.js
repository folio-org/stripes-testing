import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        user: {},
        marcTitle: `AT_C423483_MarcBibInstance_${getRandomPostfix()}`,
      };
      const fieldValues = {
        firstEdit: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '600', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '600', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '610', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '611', ind1: '\\', ind2: '\\', content: '$a ' },
        ],
        secondEdit: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '600', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '600', ind1: '\\', ind2: '\\', content: '' },
          { tag: '610', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '611', ind1: '\\', ind2: '\\', content: '$a ' },
        ],
        thirdEdit: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '1', ind2: '2', content: '' },
          { tag: '600', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '600', ind1: '\\', ind2: '\\', content: '' },
          { tag: '610', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '611', ind1: '1', ind2: '2', content: '' },
        ],
        fourthEdit: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '', ind2: '', content: '' },
          { tag: '', ind1: '1', ind2: '2', content: '' },
          { tag: '600', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '600', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '', ind2: '', content: '' },
          { tag: '611', ind1: '1', ind2: '2', content: '' },
        ],
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
          }, 20_000);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C423483_MarcBibInstance');
      });

      it(
        'C423483 Fields without tag and subfield values are deleted during saving (create MARC bibliographic) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423483'] },
        () => {
          InventoryInstances.createNewMarcBibRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField('245', `$a ${testData.marcTitle}`);

          for (let i = 0; i < 8; i++) {
            QuickMarcEditor.addEmptyFields(4 + i);
          }
          for (let i = 0; i < 8; i++) {
            QuickMarcEditor.verifyTagField(5 + i, '', '\\', '\\', '$a ', '');
          }

          cy.wait(1000);
          QuickMarcEditor.addValuesToExistingField(8, '600', '$a ');
          QuickMarcEditor.addValuesToExistingField(9, '600', '$a ');
          QuickMarcEditor.addValuesToExistingField(10, '610', '$a ');
          QuickMarcEditor.addValuesToExistingField(11, '611', '$a ');
          fieldValues.firstEdit.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              5 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          cy.wait(1000);
          QuickMarcEditor.addValuesToExistingField(5, '', '');
          QuickMarcEditor.addValuesToExistingField(9, '600', '');
          fieldValues.secondEdit.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              5 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          cy.wait(1000);
          QuickMarcEditor.addValuesToExistingField(7, '', '', '1', '2');
          QuickMarcEditor.addValuesToExistingField(11, '611', '', '1', '2');
          fieldValues.thirdEdit.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              5 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          cy.wait(1000);
          QuickMarcEditor.addValuesToExistingField(6, '', '', '', '');
          QuickMarcEditor.addValuesToExistingField(10, '', '', '', '');
          fieldValues.fourthEdit.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              5 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.pressSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.marcTitle);

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkFieldsCount(6);
          ['LDR', '001', '005', '008', '245', '999'].forEach((tag, index) => {
            QuickMarcEditor.verifyTagValue(index, tag);
          });
        },
      );
    });
  });
});
