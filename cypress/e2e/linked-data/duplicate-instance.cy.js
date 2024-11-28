import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';
import EditResource from '../../support/fragments/linked-data/editResource';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import { APPLICATION_NAMES, LOCATION_NAMES } from '../../support/constants';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

describe('Citation: duplicate existing work', () => {
  const testData = {
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueInstanceTitle: `Instance AQA title ${getRandomPostfix()}`,
    callNumber: '331.2',
  };

  after('Delete test data', () => {
    cy.getAdminToken();
    // delete inventory instance both from inventory and LDE modules
    // this might change later once corresponding instance will automatically get deleted in linked-data
    InventoryInstances.getInstanceIdApi({
      limit: 1,
      query: `title="${testData.uniqueInstanceTitle}"`,
    }).then((id) => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(id);
    });
    Work.getInstancesByTitle(testData.uniqueInstanceTitle).then((instances) => {
      const filteredInstances = instances.filter(
        (element) => element.titles[0].value === testData.uniqueInstanceTitle,
      );
      Work.deleteById(filteredInstances[0].id);
    });
  });

  beforeEach(() => {
    cy.loginAsAdmin({
      path: TopMenu.linkedDataEditor,
      waiter: SearchAndFilter.waitLoading,
    });
  });

  it(
    'C624280 [User journey] LDE - Create new instance by duplicating existing Instance plus holdings',
    { tags: ['draft', 'citation', 'linked-data-editor'] },
    () => {
      // search by any isbn
      SearchAndFilter.searchResourceByIsbn('*');
      // open instance for editing
      LinkedDataEditor.editInstanceFromSearchTable(1, 1);
      // duplicate instance
      EditResource.duplicateResource();
      EditResource.setInstanceTitle(testData.uniqueInstanceTitle);
      EditResource.saveAndClose();
      // wait for LDE page to be displayed
      LinkedDataEditor.waitLoading();
      // search work by instance title
      SearchAndFilter.searchResourceByTitle(testData.uniqueInstanceTitle);
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueInstanceTitle);
      // navigate to the inventory module
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.uniqueInstanceTitle);
      // Add holdings
      const HoldingsRecordEdit = InventoryInstance.pressAddHoldingsButton();
      HoldingsRecordEdit.fillHoldingFields({
        permanentLocation: LOCATION_NAMES.ANNEX,
        callNumber: testData.callNumber,
      });
      HoldingsRecordEdit.saveAndClose({ holdingSaved: true });
      InventoryInstance.checkHoldingsTableContent({
        name: LOCATION_NAMES.ANNEX_UI,
      });
      InventoryInstance.verifySourceInAdministrativeData('LINKED_DATA');
    },
  );
});
