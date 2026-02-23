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
        marcTitle: `AT_C411414_MarcBibInstance_${getRandomPostfix()}`,
        tag006: '006',
        tag007: '007',
        tag852: '852',
      };

      let createdInstanceId;

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

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      });

      it(
        'C411414 Move 006, 007, 852 fields when creating new "MARC Holdings" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C411414'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          InventoryInstance.goToMarcHoldingRecordAdding();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.addEmptyFields(4);
          QuickMarcEditor.checkEmptyFieldAdded(5);
          QuickMarcEditor.updateExistingTagValue(5, testData.tag006);
          QuickMarcEditor.verifyTagValue(5, testData.tag006);
          QuickMarcEditor.verifyEditableFieldIcons(5, true, true);

          QuickMarcEditor.moveFieldUp(5);
          QuickMarcEditor.verifyTagValue(4, testData.tag006);

          QuickMarcEditor.moveFieldDown(4);
          QuickMarcEditor.verifyTagValue(5, testData.tag006);

          QuickMarcEditor.addEmptyFields(5);
          QuickMarcEditor.checkEmptyFieldAdded(6);
          QuickMarcEditor.updateExistingTagValue(6, testData.tag007);
          QuickMarcEditor.verifyTagValue(6, testData.tag007);
          QuickMarcEditor.verifyEditableFieldIcons(6, true, true);

          QuickMarcEditor.moveFieldUp(6);
          QuickMarcEditor.verifyTagValue(5, testData.tag007);

          QuickMarcEditor.moveFieldDown(5);
          QuickMarcEditor.verifyTagValue(6, testData.tag007);

          QuickMarcEditor.moveFieldUp(7);
          QuickMarcEditor.verifyTagValue(6, testData.tag852);

          QuickMarcEditor.moveFieldDown(6);
          QuickMarcEditor.verifyTagValue(7, testData.tag852);
        },
      );
    });
  });
});
