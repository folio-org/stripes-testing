import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersCard from '../../support/fragments/users/usersCard';
import NewRequest from '../../support/fragments/requests/newRequest';

describe('Users', () => {
  let userData;

  before('Preconditions', () => {
    cy.createTempUser().then((userProperties) => {
      userData = userProperties;
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
    { tags: ['criticalPath', 'volaris'] },
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
