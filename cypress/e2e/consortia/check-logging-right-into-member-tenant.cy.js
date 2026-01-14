import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
import Permissions from '../../support/dictionary/permissions';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Consortia', () => {
  let user1;
  let user2 = { ...Users.generateUserModel(), ...{ username: `AT_Username_${getRandomPostfix()}` } };

  before('Create users, data', () => {
    cy.getAdminToken();
    cy.setTenant(Affiliations.College);
    cy.createTempUser([Permissions.uiUsersView.gui]).then((userProperties) => {
      user1 = userProperties;
    });
    cy.createTempUserParameterized(user2, [Permissions.uiUsersView.gui], { userType: 'staff' }).then(
      (userProperties) => {
        user2 = { ...user2, ...userProperties };
      },
    );
  });

  after('Delete users, data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    Users.deleteViaApi(user1.userId);
    Users.deleteViaApi(user2.userId);
  });

  it(
    'C387506 User created in Member tenant is logging right into Member tenant (consortia) (thunderjet)',
    { tags: ['smokeECS', 'thunderjet'] },
    () => {
      cy.login(user1.username, user1.password, {
        path: TopMenu.usersPath,
        waiter: Users.waitLoading,
      });
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

      cy.login(user2.username, user2.password, {
        path: TopMenu.usersPath,
        waiter: Users.waitLoading,
      });
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
    },
  );
});
