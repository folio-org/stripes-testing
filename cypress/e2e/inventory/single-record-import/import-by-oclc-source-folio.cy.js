import TopMenu from '../../../support/fragments/topMenu';
import testTypes from '../../../support/dictionary/testTypes';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/z39.50TargetProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import DevTeams from '../../../support/dictionary/devTeams';

let user;
let instanceRecord;
const authentication = '100473910/PAOLF';

describe('ui-inventory: import by OCLC', () => {
  before('create test data', () => {
    cy.getAdminToken()
      .then(() => {
        Z3950TargetProfiles.changeOclcWorldCatValueViaApi('100473910/PAOLF');
        InventorySearchAndFilter.createInstanceViaApi()
          .then(({ instanceData }) => {
            instanceRecord = instanceData;
          });
      });

    cy.createTempUser([
      permissions.uiInventoryViewCreateEditInstances,
      permissions.uiInventorySingleRecordImport.gui,
      permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
  });

  // after('delete test data', () => {
  //   cy.getInstance({ limit: 1, expandAll: true, query: `"oclc"=="${oclc}"` })
  //     .then(instance => {
  //       InventoryInstance.deleteInstanceViaApi(instance.id);
  //     });
  //   Users.deleteViaApi(user.userId);
  // });

  it('C343349 Overlay existing Source = FOLIO Instance by import of single MARC Bib record from OCLC (folijet)', { tags: [testTypes.smoke, DevTeams.folijet] }, () => {
    cy.visit(TopMenu.inventoryPath);
    InventorySearchAndFilter.searchByParameter('Keyword (title, contributor, identifier, HRID, UUID)', instanceRecord.instanceTitle);
    InventorySearchAndFilter.selectSearchResultItem();
    InventoryInstance.startOverlaySourceBibRecord();
    InventoryInstance.importWithOclc('1202462670');
  });
});
