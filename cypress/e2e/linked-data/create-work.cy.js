import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';
import NewResource from '../../support/fragments/linked-data/newResource';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import { APPLICATION_NAMES } from '../../support/constants';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';

describe('Citation: create work', () => {
  const testData = {
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    partName: `Part test name ${getRandomPostfix()}`,
    summaryNote: 'test summary note',
  };

  after('Delete test data', () => {
    cy.getAdminToken();
    Work.getIdByTitle(testData.uniqueTitle).then((id) => Work.deleteById(id));
  });

  beforeEach(() => {
    cy.loginAsAdmin({
      path: TopMenu.linkedDataEditor,
      waiter: LinkedDataEditor.waitLoading,
    });
  });

  it(
    'C624167 [User journey] LDE - Create new work only from blank workform',
    { tags: ['draft', 'citation', 'linked-data-editor'] },
    () => {
      // open new resource form
      LinkedDataEditor.openNewResourceForm();
      NewResource.waitLoading();
      // change data, but do not enter title
      NewResource.setPartName(testData.partName);
      NewResource.saveAndKeepEditing();
      NewResource.checkAlarmDisplayed(true);
      // enter title and keep editing
      NewResource.setTitle(testData.uniqueTitle);
      NewResource.saveAndKeepEditing();
      NewResource.checkAlarmDisplayed(false);
      NewResource.setSummaryNote(testData.summaryNote);
      NewResource.saveAndClose();
      // wait for LDE page to be displayed
      LinkedDataEditor.waitLoading();
      // search created work by title
      SearchAndFilter.searchResourceByTitle(testData.uniqueTitle);
      SearchAndFilter.checkSearchResultsByWorkTitle(testData.uniqueTitle);
      // check that work is not displayed in the inventory
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.uniqueTitle, false);
      InventorySearchAndFilter.verifyNoRecordsFound();
    },
  );
});
