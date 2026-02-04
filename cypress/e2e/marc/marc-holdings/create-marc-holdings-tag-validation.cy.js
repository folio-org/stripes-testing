import Permissions from '../../../support/dictionary/permissions';
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
        user: {},
        marcTitle: `AT_C543827_MarcBibInstance_${getRandomPostfix()}`,
        tag852: '852',
        newFieldContent: '$a test tag validation',
        tag852Index: 5,
        invalidTagValues: ['', '0', '04', '04c', 'abc', '!!!', '   '],
      };

      let createdInstanceId;
      let locationCode;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
          Permissions.uiInventoryViewCreateEditHoldings.gui,
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
        'C543827 MARC tag validation when creating "MARC holdings" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C543827'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          InventoryInstance.goToMarcHoldingRecordAdding();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateExistingField(testData.tag852, `$b ${locationCode}`);
          QuickMarcEditor.checkContentByTag(testData.tag852, `$b ${locationCode}`);

          QuickMarcEditor.addNewField('', testData.newFieldContent, testData.tag852Index);
          QuickMarcEditor.checkContent(testData.newFieldContent, testData.tag852Index + 1);

          testData.invalidTagValues.forEach((tagValue) => {
            QuickMarcEditor.updateExistingTagValue(testData.tag852Index + 1, tagValue);
            QuickMarcEditor.verifyTagValue(testData.tag852Index + 1, tagValue);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.verifyValidationCallout(0, 1);
            QuickMarcEditor.closeAllCallouts();
            if (tagValue.length < 3) {
              QuickMarcEditor.checkErrorMessage(
                testData.tag852Index + 1,
                QuickMarcEditor.tagLengthInlineErrorText,
              );
            } else {
              QuickMarcEditor.checkErrorMessage(
                testData.tag852Index + 1,
                QuickMarcEditor.invalidTagInlineErrorText,
              );
            }
          });
        },
      );
    });
  });
});
