import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';
import EditResource from '../../support/fragments/linked-data/editResource';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import NewInstance from '../../support/fragments/linked-data/newInstance';
import { APPLICATION_NAMES } from '../../support/constants';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';

describe('Citation: duplicate existing work', () => {
  const testData = {
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    uniqueInstanceTitle: `Instance AQA title ${getRandomPostfix()}`,
    resourceIdentifiers: [
      { type: 'ISBN', value: '1587657090' },
      { type: 'ISBN', value: '9781587657092' },
    ],
  };

  after('Delete test data', () => {
    cy.getAdminToken();
    Work.getIdByTitle(testData.uniqueTitle).then((id) => Work.deleteById(id));
    InventoryInstances.deleteInstanceByTitleViaApi(testData.uniqueInstanceTitle);
  });

  beforeEach(() => {
    cy.loginAsAdmin({
      path: TopMenu.linkedDataEditor,
      waiter: SearchAndFilter.waitLoading,
    });
  });

  it(
    'C624234 [User journey] LDE - Duplicate existing work',
    { tags: ['draft', 'citation', 'linked-data-editor'] },
    () => {
      // search by any title
      SearchAndFilter.searchResourceByTitle('*');
      // open work for editing
      LinkedDataEditor.selectFromSearchTable(1);
      LinkedDataEditor.editWork();
      // duplicate work
      EditResource.duplicateResource();
      EditResource.setTitle(testData.uniqueTitle);
      EditResource.saveAndKeepEditing();
      // add instance
      EditResource.openNewInstanceForm();
      NewInstance.addMainInstanceTitle(testData.uniqueInstanceTitle);
      NewInstance.addInstanceIdentifiers(testData);
      EditResource.saveAndClose();
      // wait for LDE page to be displayed
      LinkedDataEditor.waitLoading();
      // search created work by title
      SearchAndFilter.searchResourceByTitle(testData.uniqueTitle);
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);
      // check that newly created instance is displayed in the inventory
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.uniqueInstanceTitle);
      // check source
      InventoryInstance.verifySourceInAdministrativeData('LINKED_DATA');
      InventorySearchAndFilter.closeInstanceDetailPane();
      InventorySearchAndFilter.selectResultCheckboxes(1);
      InventorySearchAndFilter.verifySelectedRecords(1);
    },
  );
});
