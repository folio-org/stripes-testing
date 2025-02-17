import TopMenu from '../../support/fragments/topMenu';
import users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';
import UsersSearchResultsPane from '../../support/fragments/users/usersSearchResultsPane';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Users', () => {
  const userLastName = getTestEntityValue('lastname');

  before('Preconditions', () => {
    cy.loginAsAdmin({
      path: TopMenu.usersPath,
      waiter: UsersSearchPane.waitLoading,
    });
  });

  after('Deleting created entities', () => {
    cy.getAdminToken();
    cy.getUsers({ query: `personal.lastName="${userLastName}"` }).then((userResp) => {
      users.deleteViaApi(userResp[0].id);
    });
  });

  it(
    'C422168 Verify that user pane appears after user creation (volaris)',
    { tags: ['extendedPath', 'volaris', 'C422168', 'eurekaPhase1'] },
    () => {
      UsersSearchResultsPane.openNewUser();
      cy.createUser(userLastName, 'undergrad (Undergraduate Student)', 'test@folio.org');
      UsersCard.waitLoading();
    },
  );
});
