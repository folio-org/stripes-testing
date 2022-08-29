import TopMenu from '../../support/fragments/topMenu';
import InventoryActions from '../../support/fragments/inventory/inventoryActions';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import Users from '../../support/fragments/users/users';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../support/fragments/inventory/inventoryViewSource';
import InventorySearch from '../../support/fragments/inventory/inventorySearch';

let user;
const oclc = '1007797324';

describe('data-import: import by OCLC', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventorySingleRecordImport.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
  });

  beforeEach('navigate to inventory', () => {
    cy.visit(TopMenu.inventoryPath);
  });

  after('delete test data', () => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"oclc"=="${oclc}"` })
      .then(instance => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    Users.deleteViaApi(user.userId);
  });

  it('C193953 Overlay existing Source = MARC Instance by import of single MARC Bib record from OCLC (Prokopovych)', { tags: [testTypes.smoke] }, () => {
    InventoryActions.import(oclc);
    InventoryInstance.viewSource();
    InventoryViewSource.contains('999\tf f\t‡s');
  });

  it('C193952 Create Instance by import of single MARC Bib record from OCLC (Prokopovych)', { tags: [testTypes.smoke] }, () => {
    InventorySearch.searchByParameter('OCLC number, normalized', oclc);
    InventorySearch.selectSearchResultItem();
    InventoryInstance.viewSource();
    InventoryViewSource.contains('999\tf f\t‡s');
  });
});
