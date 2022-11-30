import TopMenu from '../../../support/fragments/topMenu';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/z39.50TargetProfiles';
import DevTeams from '../../../support/dictionary/devTeams';

let user;
const oclc = '1007797324';

describe('ui-inventory: import by OCLC', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventorySingleRecordImport.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);

        Z3950TargetProfiles.changeOclcWorldCatValueViaApi('100473910/PAOLF');
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

  it('C193953 Overlay existing Source = MARC Instance by import of single MARC Bib record from OCLC (folijet) (prokopovych))', { tags: [testTypes.smoke, DevTeams.folijet] }, () => {
    InventoryActions.import(oclc);
    InventoryInstance.viewSource();
    InventoryViewSource.contains('999\tf f\t‡s');
  });

  it('C193952 Create Instance by import of single MARC Bib record from OCLC (folijet) (prokopovych)', { tags: [testTypes.smoke, DevTeams.folijet] }, () => {
    InventorySearchAndFilter.searchByParameter('OCLC number, normalized', oclc);
    InventorySearchAndFilter.selectSearchResultItem();
    InventoryInstance.viewSource();
    InventoryViewSource.contains('999\tf f\t‡s');
  });
});
