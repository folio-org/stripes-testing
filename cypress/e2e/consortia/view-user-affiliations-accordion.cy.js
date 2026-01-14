import { tenantNames } from '../../support/dictionary/affiliations';
import permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import UsersCard from '../../support/fragments/users/usersCard';
import UsersSearchPane from '../../support/fragments/users/usersSearchPane';

describe('Consortia', () => {
  let firstUser;
  let secondUser;

  before(() => {
    cy.resetTenant();
    cy.getAdminToken();

    cy.createTempUser([]).then((userProperties) => {
      firstUser = userProperties;
    });

    cy.createTempUser([
      permissions.consortiaSettingsConsortiaAffiliationsEdit.gui,
      permissions.consortiaSettingsConsortiaAffiliationsView.gui,
      permissions.uiUsersPermissionsView.gui,
      permissions.uiUsersView.gui,
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
    { tags: ['smokeECS', 'thunderjet', 'C380505'] },
    () => {
      UsersSearchPane.searchByUsername(firstUser.username);
      UsersSearchPane.selectUserFromList(firstUser.username);
      UsersCard.verifyUserCardOpened();
      UsersCard.verifyAffiliationsQuantity('1');
      UsersCard.expandAffiliationsAccordion();
      UsersCard.verifyAffiliationsDetails(tenantNames.central, 1, tenantNames.central);
      UsersCard.expandAffiliationsAccordion();
      UsersCard.verifyAffiliationsQuantity('1');
      UsersCard.affiliationsAccordionCovered();
    },
  );
});
