import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import { INSTANCE_SOURCE_NAMES, APPLICATION_NAMES } from '../../support/constants';
import EditResource from '../../support/fragments/linked-data/editResource';
import ViewMarc from '../../support/fragments/linked-data/viewMarc';
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Work from '../../support/fragments/linked-data/work';

describe('Citation: edit existing instance', () => {
  const source = INSTANCE_SOURCE_NAMES.LDE;

  const testData = {
    uniqueInstanceTitle: `Instance AQA title ${getRandomPostfix()}`,
    edition: 'test edition',
  };

  beforeEach(() => {
    cy.loginAsAdmin({
      path: TopMenu.linkedDataEditor,
      waiter: SearchAndFilter.waitLoading,
    });
  });

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

  it(
    'C627245 [User journey] LDE - Edit existing resource | create MARC derived record',
    { tags: ['draft', 'citation', 'linked-data-editor', 'shiftLeft'] },
    () => {
      // prepare inventory instance created by LDE
      SearchAndFilter.searchResourceByIsbn('*');
      LinkedDataEditor.editInstanceFromSearchTable(1, 1);
      EditResource.duplicateResource();
      EditResource.setValueForTheField(testData.uniqueInstanceTitle, 'Main Title');
      EditResource.clearField('Other Title Information');
      // generate random valid lccn in order to prevent unique validation error later
      EditResource.setValueForTheField(LinkedDataEditor.generateValidLccn(), 'LCCN');
      EditResource.saveAndClose();
      LinkedDataEditor.waitLoading();
      // navigate to the inventory module
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
      // search by LDE source and unique title
      InventoryInstances.searchBySource(source);
      InventoryInstances.searchByTitle(testData.uniqueInstanceTitle);
      InventoryInstance.editInstanceInLde();
      // edit edition
      EditResource.waitLoading();
      EditResource.setEdition(testData.edition);
      EditResource.saveAndKeepEditing();
      EditResource.viewMarc();
      // check changes in MARC
      ViewMarc.waitLoading();
      ViewMarc.checkMarcContainsData(testData.edition);
      ViewMarc.closeMarcView();
      EditResource.saveAndClose();
      // wait for LDE page to be displayed
      LinkedDataEditor.waitLoading();
      // search created work by title
      SearchAndFilter.searchResourceByTitle(testData.uniqueInstanceTitle);
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueInstanceTitle);
      // double check inventory
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
      // search by LDE source AND title
      InventoryInstances.searchBySource(source);
      InventoryInstances.searchByTitle(testData.uniqueInstanceTitle);
      InventoryInstance.verifySourceInAdministrativeData('LINKED_DATA');
    },
  );
});
