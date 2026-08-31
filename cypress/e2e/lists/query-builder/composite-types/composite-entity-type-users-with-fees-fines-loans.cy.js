import Permissions from '../../../../support/dictionary/permissions';
import { USERS_WITH_FEES_FINES_LOANS_FIELDS } from '../../../../support/constants/query-builder/usersWithFeeFinesLoansFields';
import QueryModal from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

let user;
const listName = `AT_C1259780_List_${getRandomPostfix()}`;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Composite Entity Types', () => {
      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.uiFeeFinesActions.gui,
          Permissions.uiFeeFines.gui,
          Permissions.uiUsersViewLoans.gui,
          Permissions.uiUsersViewRequests.gui,
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
        'C1259780 Composite ET: Users with fees/fines, loans (athena)',
        { tags: ['extendedPath', 'athena', 'C1259780'] },
        () => {
          // Step 1: Click on "New" button, add list name, click on "Select record type" dropdown and select "Users with fees/fines, loans"
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.usersWithFeeFineLoans);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Click on "Build query" button
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Click on the "Field" dropdown
          QueryModal.clickSelectFieldButton();
          QueryModal.closeOpenedSelection();

          // Step 4: Search for the source "User"
          QueryModal.verifyAllAvailableFieldOptions(
            Object.values(USERS_WITH_FEES_FINES_LOANS_FIELDS.USER),
          );

          // Step 5: Search for the source "User — Patron group"
          QueryModal.verifyAllAvailableFieldOptions(
            Object.values(USERS_WITH_FEES_FINES_LOANS_FIELDS.PATRON_GROUP),
          );

          // Step 6: Search for the source "Fee/Fine account"
          QueryModal.verifyAllAvailableFieldOptions(
            Object.values(USERS_WITH_FEES_FINES_LOANS_FIELDS.FEE_FINE_ACCOUNT),
          );

          // Step 7: Search for the source "Loan"
          QueryModal.verifyAllAvailableFieldOptions(
            Object.values(USERS_WITH_FEES_FINES_LOANS_FIELDS.LOAN),
          );

          // Step 8: Search for the source "Item"
          QueryModal.verifyAllAvailableFieldOptions(
            Object.values(USERS_WITH_FEES_FINES_LOANS_FIELDS.ITEM),
          );

          // Step 9: Verify that "Item status name" field is NOT available
          QueryModal.verifyFieldOptionAbsent(['Item status name']);
        },
      );
    });
  });
});
