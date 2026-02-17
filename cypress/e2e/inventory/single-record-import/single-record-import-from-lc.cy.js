import { Permissions } from '../../../support/dictionary';
import InventoryActions from '../../../support/fragments/inventory/inventoryActions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances, {
  searchInstancesOptions,
} from '../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('Inventory', () => {
  const locNumber = '2008032246';
  const instanceTitle =
    'Stress, neurotransmitters, and hormones : neuroendocrine and genetic mechanisms / edited by Richard Kvetňanský ... [et al.].';
  const searchOption = searchInstancesOptions[3]; // Identifier (all)
  const field008EnteredValue = '080722';

  let user;

  describe('Single record import', () => {
    before('Create test user and login', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);

      cy.createTempUser([
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.toggleLocSingleImportProfileViaAPI();

        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceByTitleViaApi(instanceTitle);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C397981 Create record by import of single MARC record from LC (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C397981'] },
      () => {
        InventoryActions.importLoc(locNumber);
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(instanceTitle);
        InventoryInstance.getId().then((instanceId) => {
          InventorySearchAndFilter.closeInstanceDetailPane();

          InventorySearchAndFilter.selectSearchOption(searchOption);
          InventorySearchAndFilter.verifyDefaultSearchOptionSelected(searchOption);
          InventorySearchAndFilter.executeSearch(locNumber);
          InventorySearchAndFilter.verifyResultListExists();
          InventoryInstances.selectInstanceById(instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.checkInstanceTitle(instanceTitle);

          InventoryInstance.viewSource();
          InventoryViewSource.contains(locNumber);
          InventoryViewSource.close();

          cy.intercept('/records-editor/records*').as('getRecord');
          InventoryInstance.editMarcBibliographicRecord();
          cy.wait('@getRecord').then(({ response }) => {
            const field008Data = response.body.fields.find((field) => field.tag === '008');
            expect(field008Data.content.Entered).to.equal(field008EnteredValue);
          });
        });
      },
    );
  });
});
