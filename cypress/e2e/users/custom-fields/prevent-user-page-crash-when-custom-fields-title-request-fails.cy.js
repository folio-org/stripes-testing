import CapabilitySets from '../../../support/dictionary/capabilitySets';
import TopMenu from '../../../support/fragments/topMenu';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import { generateTextFieldCustomFieldData } from '../../../support/utils/customFields';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Users', () => {
  describe('Custom Fields (Users)', () => {
    const testData = {};
    const errorMessage =
      'Unable to retrieve section title due to a module error. Please try again. If problem persists please contact your system administrator.';
    const customFieldsLabelUrl = /settings\/entries\?.*custom_fields_label/;

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        cy.createCustomFieldsViaApi([
          generateTextFieldCustomFieldData({ testNumber: 'C1415771' }),
        ]).then((createdCustomFields) => {
          testData.createdCustomFields = createdCustomFields;
        });
        cy.createTempUser([]).then((viewUserProps) => {
          testData.viewUser = viewUserProps;
        });
        cy.createTempUser([]).then((staffUserProps) => {
          testData.staffUser = staffUserProps;
          cy.assignCapabilitiesToExistingUser(
            testData.staffUser.userId,
            [],
            [CapabilitySets.uiUsersEdit],
          );
          cy.login(testData.staffUser.username, testData.staffUser.password, {
            path: TopMenu.usersPath,
            waiter: UsersSearchPane.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      if (testData.createdCustomFields?.length) {
        cy.deleteCustomFieldsViaApi({ ids: testData.createdCustomFields.map(({ id }) => id) });
      }
      if (testData.staffUser) Users.deleteViaApi(testData.staffUser.userId);
      if (testData.viewUser) Users.deleteViaApi(testData.viewUser.userId);
    });

    it(
      "C1415771 Prevent the user's page from crashing when a request for custom fields/title fails (vega)",
      { tags: ['extendedPath', 'vega', 'C1415771'] },
      () => {
        // Step 1: Navigate to any user details pane — user card is displayed
        UsersSearchPane.openUserCard(testData.staffUser.username);
        UsersCard.waitLoading();

        // Step 2: Block entries?query=...custom_fields_label... requests —
        // simulates "Block request URL" in DevTools Network tab
        cy.intercept('GET', customFieldsLabelUrl, { forceNetworkError: true }).as(
          'customFieldsLabelBlocked',
        );

        // Step 3: Navigate to another user details pane — page loads without crashing,
        // error toast appears
        UsersSearchPane.openUserCard(testData.viewUser.username);
        UsersCard.waitLoading();
        InteractorsTools.checkCalloutErrorMessage(errorMessage);

        // Step 4: Click Actions -> Edit — edit page loads without crashing,
        // error toast appears
        UserEdit.openEdit();
        InteractorsTools.checkCalloutErrorMessage(errorMessage);

        // Step 5: Unblock the custom fields label request (restore normal behaviour)
        cy.intercept('GET', customFieldsLabelUrl).as('customFieldsLabelUnblocked');
      },
    );
  });
});
