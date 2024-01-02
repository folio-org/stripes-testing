import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC -> MARC Bibliographic -> Create new MARC bib', () => {
  describe('245 field validation', () => {
    let userId;

    before(() => {
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });
    after('Delete test data', () => {
      Users.deleteViaApi(userId);
    });

    it(
      'C422117 "245" field presence validation when creating a new "MARC bib" record (spitfire) (TaaS)',
      { tags: ['criticalPath', 'spitfire'] },
      () => {
        InventoryInstance.newMarcBibRecord();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.updateExistingField('LDR', '00000naa\\a2200000uu\\4500');
        QuickMarcEditor.updateExistingTagName('245', '246');
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.verifyNo245TagCallout();
        QuickMarcEditor.updateExistingTagName('246', '245');
        QuickMarcEditor.updateExistingField('245', '$a title');
        QuickMarcEditor.addNewField('245', '$a Another title', 4);
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.verifyMultiple245TagCallout();
      },
    );
  });
});
