import { CALL_NUMBER_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Create MARC holdings', () => {
      const testData = {
        tag008: '008',
        tag245: '245',
        tag852: '852',
        bibTitle: `AT_C389503_MarcBibInstance_${getRandomPostfix()}`,
        headerTitle: /New .*MARC holdings record/,
        location: QuickMarcEditor.getExistingLocation(),
      };

      const indicatorData = [
        { value: '0', callNumberTypeName: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS },
        { value: '3', callNumberTypeName: CALL_NUMBER_TYPE_NAMES.SUDOC },
        { value: '9', callNumberTypeName: '-' },
        { value: '%', callNumberTypeName: '-' },
      ];

      let createdInstanceId;
      let locationCode;

      before('create test data and login', () => {
        cy.getAdminToken();
        cy.createSimpleMarcBibViaAPI(testData.bibTitle).then((instanceId) => {
          createdInstanceId = instanceId;
        });
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          locationCode = res.code;
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken().then(() => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(createdInstanceId);
          Users.deleteViaApi(testData.user.userId);
        });
      });

      it(
        'C389503 Verify that "Call number type" is correctly mapped when create new "MARC Holdings" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C389503'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          indicatorData.forEach(({ value, callNumberTypeName }) => {
            InventoryInstance.goToMarcHoldingRecordAdding();
            QuickMarcEditor.waitLoading();

            QuickMarcEditor.checkPaneheaderContains(testData.headerTitle);
            QuickMarcEditor.checkFieldsExist([testData.tag852]);
            QuickMarcEditor.updateExistingField(testData.tag852, `$b ${locationCode}`);
            QuickMarcEditor.checkContentByTag(testData.tag852, `$b ${locationCode}`);
            QuickMarcEditor.updateIndicatorValue(testData.tag852, value);

            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveHoldings();

            HoldingsRecordView.checkCallNumberType(callNumberTypeName);
            HoldingsRecordView.close();
            InventoryInstance.waitLoading();
          });
        },
      );
    });
  });
});
