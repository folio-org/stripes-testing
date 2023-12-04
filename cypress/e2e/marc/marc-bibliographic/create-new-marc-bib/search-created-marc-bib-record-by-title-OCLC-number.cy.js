import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC -> MARC Bibliographic -> Create new MARC bib', () => {
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
    'C422121 Search created "MARC bib" record by Title, OCLC number(spitfire) (TaaS)',
    { tags: ['criticalPath', 'spitfire'] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.updateExistingField('LDR', '00000naa\\a2200000uu\\4500');
      QuickMarcEditor.updateExistingField('245', 'Sophisticated title #1');
      QuickMarcEditor.addNewField('035', '$a (OCoLC)ocn607TST001', 4);
      QuickMarcEditor.pressSaveAndClose();
      InventoryInstance.searchResultsWithOption(
        'Keyword (title, contributor, identifier, HRID, UUID)',
        '$a (OCoLC)ocn607TST001',
      );
      InventoryInstance.searchResultsWithOption(
        'OCLC number, normalized',
        'Sophisticated title #1',
      );
    },
  );
});
