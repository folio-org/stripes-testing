import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Consortia', () => {
  let firstUser;
  let secondUser;

  before(() => {
    cy.getAdminToken();

    cy.createTempUser([]).then((userProperties) => {
      firstUser = userProperties;
    });

    cy.createTempUser([permissions.uiUsersView.gui]).then((secondUserProperties) => {
      secondUser = secondUserProperties;
      cy.login(secondUser.username, secondUser.password, {
        path: TopMenu.usersPath,
        waiter: Users.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(firstUser.userId);
    Users.deleteViaApi(secondUser.userId);
  });

  it(
    'C380507 A user without appropriate permission can not view a users affiliations accordion (consortia) (thunderjet)',
    { tags: ['criticalPathECS', 'thunderjet', 'C380507'] },
    () => {
      UsersSearchPane.searchByUsername(firstUser.username);
      UsersSearchPane.selectUserFromList(firstUser.username);
      UsersCard.verifyUserCardOpened();
      UsersCard.affiliationsAccordionIsAbsent();
      UsersSearchPane.searchByUsername(secondUser.username);
      UsersSearchPane.selectUserFromList(secondUser.username);
      UsersCard.verifyUserCardOpened();
      UsersCard.affiliationsAccordionIsAbsent();
    },
  );
});
