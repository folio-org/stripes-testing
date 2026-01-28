import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        tagLDR: 'LDR',
        tag245: '245',
        field245CalloutText: 'Field 245 is required.',
      };

      before('Create test data', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C503055 Cannot create "MARC bib" record without a value in "245" field (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C503055'] },
        () => {
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.check008FieldContent();
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.field245CalloutText);
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.updateExistingField(testData.tag245, '');
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.checkCallout(testData.field245CalloutText);
          QuickMarcEditor.verifyValidationCallout(0, 1);
        },
      );
    });
  });
});
