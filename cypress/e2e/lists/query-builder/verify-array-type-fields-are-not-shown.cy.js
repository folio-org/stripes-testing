import Permissions from '../../../support/dictionary/permissions';
import QueryModal from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C451497_List_${getRandomPostfix()}`;
const listDescription = `AT_C451497_Description_${getRandomPostfix()}`;
let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiOrganizationsViewEditDelete.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C451497 [Organizations] Verify that array type fields are not shown in the Query Builder (corsair)',
      { tags: ['criticalPath', 'corsair', 'C451497'] },
      () => {
        // Step 1: Create new list with Organizations record type and open Build query form
        Lists.openNewListPane();
        Lists.setName(listName);
        Lists.setDescription(listDescription);
        Lists.selectRecordType(Lists.recordTypes.organizations);
        Lists.buildQuery();
        QueryModal.verifyQueryTextboxReadOnly();
        QueryModal.verifyQueryTextboxResizable();

        // Step 2-3: Click "Select field" dropdown in the "Field" column => search for the field 'Orgs - aliases'
        QueryModal.filterFieldSelectionList('Orgs - aliases');
        QueryModal.verifyFieldOptionAbsentInTheList();
      },
    );
  });
});
