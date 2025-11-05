import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Create MARC holdings', () => {
      const testData = {
        user: {},
        marcTitle: `AT_C423484_MarcBibInstance_${getRandomPostfix()}`,
        defaultFields: ['LDR', '001', '004', '005', '008', '852', '999'],
      };
      const fieldValues = {
        firstEdit: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
        ],
        secondEdit: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '1', ind2: '2', content: '' },
        ],
        thirdEdit: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '', ind2: '', content: '' },
          { tag: '', ind1: '1', ind2: '2', content: '' },
        ],
      };

      let createdInstanceId;
      let locationCode;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.createSimpleMarcBibViaAPI(testData.marcTitle).then((instanceId) => {
            createdInstanceId = instanceId;
          });
          cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
            locationCode = res.code;
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(createdInstanceId);
      });

      it(
        'C423484 Fields without tag and subfield values are deleted during saving (create MARC bibliographic) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423484'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          InventoryInstance.goToMarcHoldingRecordAdding();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateExistingField('852', `$b ${locationCode}`);
          QuickMarcEditor.checkContentByTag('852', `$b ${locationCode}`);

          for (let i = 0; i < 4; i++) {
            QuickMarcEditor.addEmptyFields(5 + i);
          }
          for (let i = 0; i < 4; i++) {
            QuickMarcEditor.verifyTagField(6 + i, '', '\\', '\\', '$a ', '');
          }

          cy.wait(1000);
          QuickMarcEditor.addValuesToExistingField(6, '', '');
          fieldValues.firstEdit.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              6 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          cy.wait(1000);
          QuickMarcEditor.addValuesToExistingField(8, '', '', '1', '2');
          fieldValues.secondEdit.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              6 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          cy.wait(1000);
          QuickMarcEditor.addValuesToExistingField(7, '', '', '', '');
          fieldValues.thirdEdit.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              6 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkFieldsCount(testData.defaultFields.length);
          QuickMarcEditor.checkFieldsExist(testData.defaultFields);
        },
      );
    });
  });
});
