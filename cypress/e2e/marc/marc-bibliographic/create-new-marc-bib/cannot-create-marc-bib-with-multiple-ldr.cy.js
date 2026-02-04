import { Permissions } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tag245: '245',
        tagLDR: 'LDR',
        content245: `$a C496193 test record ${getRandomPostfix()}`,
        errorMessage: 'Record not saved: Communication problem with server. Please try again.',
      };
      let user;
      let instanceId;

      before('Create user', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Delete user and instance', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C496193 Cannot create "MARC bibliographic" record with multiple "LDR" fields (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C496193'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.updateExistingField(testData.tag245, testData.content245);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 1);

          QuickMarcEditor.addNewField(testData.tagLDR, '', 4);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.errorMessage);

          QuickMarcEditor.updateExistingTagValue(5, '');
          QuickMarcEditor.deleteField(5);

          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.getId().then((id) => {
            instanceId = id;
          });
        },
      );
    });
  });
});
