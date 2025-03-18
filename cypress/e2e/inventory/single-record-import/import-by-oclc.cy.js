import { Permissions } from '../../../support/dictionary';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

let user;
let instanceHRID;
const oclc = '1007797324';
const OCLCAuthentication = '100481406/PAOLF';

describe('Inventory', () => {
  describe('Single record import', () => {
    before('Create test user and login', () => {
      cy.getAdminToken();
      Z3950TargetProfiles.changeOclcWorldCatValueViaApi(OCLCAuthentication);

      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHRID}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C193952 Create Instance by import of single MARC Bib record from OCLC (folijet)',
      { tags: ['smoke', 'folijet', 'C193952'] },
      () => {
        InventorySearchAndFilter.searchByParameter('OCLC number, normalized', oclc);
        InventorySearchAndFilter.selectSearchResultItem();
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHRID = initialInstanceHrId;
        });
        InventoryInstance.viewSource();
        InventoryViewSource.contains('999\tf f\t$i');
        InventoryViewSource.contains('$s');
      },
    );
  });
});
