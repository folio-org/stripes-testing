import NewRequest from '../../support/fragments/requests/newRequest';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Users', () => {
  let userData;

  before('Preconditions', () => {
    cy.getAdminToken().then(() => {
      cy.createTempUser().then((userProperties) => {
        userData = userProperties;
      });
    });
    cy.loginAsAdmin({
      path: TopMenu.usersPath,
      waiter: UsersSearchPane.waitLoading,
      authRefresh: true,
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
