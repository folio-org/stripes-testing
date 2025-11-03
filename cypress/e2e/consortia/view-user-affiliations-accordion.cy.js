import Affiliations from '../../support/dictionary/affiliations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Consortia', () => {
  let firstUser;
  let secondUser;

  before(() => {
    cy.getAdminToken();
    cy.setTenant(Affiliations.Consortia);

    cy.createTempUser([]).then((userProperties) => {
      firstUser = userProperties;
    });

    cy.createTempUser([
      Permissions.consortiaSettingsConsortiaAffiliationsEdit.gui,
      Permissions.consortiaSettingsConsortiaAffiliationsView.gui,
      Permissions.uiUsersPermissionsView.gui,
      Permissions.uiUsersView.gui,
    ]).then((secondUserProperties) => {
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
    'C380505 View a users affiliations accordion in the third details pane (consortia) (thunderjet)',
    { tags: ['smokeECS', 'thunderjet'] },
    () => {
      UsersSearchPane.searchByUsername(firstUser.username);
      UsersSearchPane.selectUserFromList(firstUser.username);
      UsersCard.varifyUserCardOpened();
      UsersCard.verifyAffiliationsQuantity('1');
      UsersCard.expandAffiliationsAccordion();
      UsersCard.verifyAffiliationsDetails('Central Office', 1, 'Central Office');
      UsersCard.expandAffiliationsAccordion();
      UsersCard.verifyAffiliationsQuantity('1');
      UsersCard.affiliationsAccordionCovered();
    },
  );
});
