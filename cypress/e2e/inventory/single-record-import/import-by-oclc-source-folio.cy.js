import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/z39.50TargetProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';

let user;
const oclc = '1007797324';
const authentication = '100473910/PAOLF';

describe('ui-inventory: import by OCLC', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.uiInventoryViewCreateEditInstances,
      permissions.uiInventorySingleRecordImport.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
  });

  after('delete test data', () => {
    cy.getInstance({ limit: 1, expandAll: true, query: `"oclc"=="${oclc}"` })
      .then(instance => {
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
    Users.deleteViaApi(user.userId);
  });

  it('C343349 Overlay existing Source = FOLIO Instance by import of single MARC Bib record from OCLC (folijet)', { tags: [testTypes.smoke] }, () => {
    cy.visit(SettingsMenu.targetProfilesPath);
    Z3950TargetProfiles.openOclcWorldCat();
    Z3950TargetProfiles.editOclcWorldCat(authentication);
    Z3950TargetProfiles.checkIsOclcWorldCatIsChanged(authentication);

    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
  });
});
