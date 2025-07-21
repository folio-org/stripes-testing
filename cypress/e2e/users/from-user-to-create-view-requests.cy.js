import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import NewRequest from '../../support/fragments/requests/newRequest';
import UserEdit from '../../support/fragments/users/userEdit';

describe('Users', () => {
  let userData;

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser().then((userProperties) => {
        userData = userProperties;
      });

      UserEdit.setupUserDefaultServicePoints(Cypress.env('diku_login'));
    });
    cy.loginAsAdmin({
      path: TopMenu.usersPath,
      waiter: UsersSearchPane.waitLoading,
    });
  });

  after('Deleting created entities', () => {
    Users.deleteViaApi(userData.userId);
  });

  it(
    "C720 Make sure there's a link from User to Create/View Requests (volaris)",
    { tags: ['criticalPath', 'volaris', 'C720'] },
    () => {
      UsersSearchPane.searchByKeywords(userData.username);
      UsersSearchPane.selectUserFromList(userData.username);
      UsersCard.waitLoading();
      UsersCard.expandRequestSection();
      UsersCard.startRequestAdding();
      NewRequest.waitLoadingNewRequestPage();
    },
  );
});
