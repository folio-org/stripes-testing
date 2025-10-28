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
        marcTitle: `AT_C503071_MarcBibInstance_${getRandomPostfix()}`,
        tag852: '852',
        tag999: '999',
        tag999IndicatorValue: 'f',
      };

      const newField999 = {
        rowIndex: 6,
        tag: testData.tag999,
        content: '$a test duplicates',
        indicator0: testData.tag999IndicatorValue,
        indicator1: testData.tag999IndicatorValue,
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
        'C503071 Create a new MARC holdings record with multiple "999 ff" fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C503071'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          InventoryInstance.goToMarcHoldingRecordAdding();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateExistingField(testData.tag852, `$b ${locationCode}`);
          QuickMarcEditor.checkContentByTag(testData.tag852, `$b ${locationCode}`);

          QuickMarcEditor.addEmptyFields(newField999.rowIndex - 1);
          QuickMarcEditor.fillInFieldValues(
            newField999.rowIndex,
            newField999.tag,
            newField999.content,
            newField999.indicator0,
            newField999.indicator1,
          );
          QuickMarcEditor.checkContent(newField999.content, newField999.rowIndex);
          QuickMarcEditor.verifyAllBoxesInARowAreDisabled(newField999.rowIndex);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.waitLoading();

          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.verifyTagValue(newField999.rowIndex, testData.tag999);
          QuickMarcEditor.checkFieldsCount(7);
          QuickMarcEditor.verifyIndicatorValue(
            testData.tag999,
            testData.tag999IndicatorValue,
            testData.tag999IndicatorValue,
          );
          QuickMarcEditor.verifyNoFieldWithContent(newField999.content);
        },
      );
    });
  });
});
