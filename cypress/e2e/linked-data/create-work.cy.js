import Work from '../../support/fragments/linked-data/work';
import TopMenu from '../../support/fragments/topMenu';
import getRandomPostfix from '../../support/utils/stringTools';
import LinkedDataEditor from '../../support/fragments/linked-data/linkedDataEditor';
import EditResource from '../../support/fragments/linked-data/editResource';
import SearchAndFilter from '../../support/fragments/linked-data/searchAndFilter';
import { APPLICATION_NAMES, LDE_ROLES } from '../../support/constants';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import WorkProfileModal from '../../support/fragments/linked-data/workProfileModal';
import Users from '../../support/fragments/users/users';

let user;
const roleNames = [LDE_ROLES.CATALOGER, LDE_ROLES.CATALOGER_LDE];

describe('Citation: create work', () => {
  const testData = {
    uniqueTitle: `Cypress test ${getRandomPostfix()}`,
    partName: `Part test name ${getRandomPostfix()}`,
    summaryNote: 'test summary note',
    roleIds: [],
  };

  before('Create test data', () => {
    cy.getAdminToken();

    roleNames.forEach((roleName) => {
      cy.getUserRoleIdByNameApi(roleName).then((roleId) => {
        if (roleId) {
          testData.roleIds.push(roleId);
        }
      });
    });

    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
    });

    cy.then(() => {
      if (testData.roleIds.length > 0) {
        cy.updateRolesForUserApi(user.userId, testData.roleIds);
      }
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Work.getIdByTitle(testData.uniqueTitle).then((id) => Work.deleteById(id));
    Users.deleteViaApi(user.userId);
  });

  beforeEach(() => {
    cy.login(user.username, user.password, {
      path: TopMenu.linkedDataEditor,
      waiter: LinkedDataEditor.waitLoading,
      authRefresh: true,
    });
  });

  it(
    'C624167 [User journey] LDE - Create new work only from blank workform (citation)',
    { tags: ['smoke', 'citation', 'C624167', 'linked-data-editor', 'shiftLeft'] },
    () => {
      // open new resource form
      LinkedDataEditor.openNewResourceForm();
      // check that modal is displayed
      WorkProfileModal.waitLoading();
      // check that default option 'Books' is there
      WorkProfileModal.checkOptionSelected('Books');
      WorkProfileModal.selectDefaultOption();
      EditResource.waitLoading();
      // change data, but do not enter title
      EditResource.setValueForTheField(testData.partName, 'Part name');
      EditResource.saveAndKeepEditing();
      EditResource.checkAlarmDisplayed(true);
      // enter title and keep editing
      EditResource.setValueForTheField(testData.uniqueTitle, 'Preferred Title for Work');
      EditResource.saveAndKeepEditing();
      EditResource.checkAlarmDisplayed(false);
      EditResource.setNoteValue(testData.summaryNote, 'Summary note');
      EditResource.saveAndClose();
      // wait for LDE page to be displayed
      LinkedDataEditor.waitLoading();
      // search created work by title
      SearchAndFilter.searchResourceByTitle(testData.uniqueTitle);
      SearchAndFilter.checkSearchResultsByTitle(testData.uniqueTitle);
      // check that work is not displayed in the inventory
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
      InventoryInstances.searchByTitle(testData.uniqueTitle, false);
      InventorySearchAndFilter.verifyNoRecordsFound();
    },
  );
});
