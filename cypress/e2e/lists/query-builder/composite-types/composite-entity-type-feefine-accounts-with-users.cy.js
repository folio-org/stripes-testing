import Permissions from '../../../../support/dictionary/permissions';
import { FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS } from '../../../../support/constants/query-builder/feeFineAccountsWithUsersFields';
import QueryModal from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
const listName = `AT_C1259779_List_${getRandomPostfix()}`;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Composite Entity Types', () => {
      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.uiFeeFinesActions.gui,
          Permissions.uiFeeFines.gui,
          Permissions.uiUsersViewLoans.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C1259779 Composite ET: Fee/fine accounts with users (athena)',
        { tags: ['extendedPath', 'athena', 'C1259779'] },
        () => {
          // Step 1: Click on "New" button, add list name, click on "Select record type" dropdown and select "Fee/Fine accounts with users"
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.feeFineAccountsWithUsers);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Click on "Build query" button
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Click on the "Field" dropdown
          QueryModal.clickSelectFieldButton();
          QueryModal.closeOpenedSelection();

          // Step 4: Search for the source "Fee/Fine accounts"
          Object.values(FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS.FEE_FINE_ACCOUNTS).forEach(
            (fieldName) => {
              QueryModal.selectField(fieldName);
            },
          );

          // Step 5: Search for the source "User"
          Object.values(FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS.USER).forEach((fieldName) => {
            QueryModal.selectField(fieldName);
          });

          // Step 6: Search for the source "User — Patron group"
          Object.values(FEE_FINE_ACCOUNTS_WITH_USERS_FIELDS.PATRON_GROUP).forEach((fieldName) => {
            QueryModal.selectField(fieldName);
          });
        },
      );
    });
  });
});
