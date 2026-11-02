import Affiliations, { tenantNames } from '../../support/dictionary/affiliations';
import Permissions from '../../support/dictionary/permissions';
import ConsortiumManager from '../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Consortia', () => {
  let user1 = {
    ...Users.generateUserModel(),
    ...{ username: `AT_Username_${getRandomPostfix()}` },
  };
  let user2 = {
    ...Users.generateUserModel(),
    ...{ username: `AT_Username_${getRandomPostfix()}` },
  };

  before('Create users, data', () => {
    cy.getAdminToken();
    cy.setTenant(Affiliations.College);
    cy.createTempUserParameterized(user1, [Permissions.uiUsersView.gui], {
      userType: 'staff',
    }).then((userProperties) => {
      user1 = { ...user1, ...userProperties };
    });
    cy.createTempUserParameterized(user2, [Permissions.uiUsersView.gui], {
      userType: 'staff',
    }).then((userProperties) => {
      user2 = { ...user2, ...userProperties };
    });
  });

  after('Delete users, data', () => {
    cy.resetTenant();
    cy.getAdminToken();
    cy.setTenant(Affiliations.College);
    Users.deleteViaApi(user1.userId);
    Users.deleteViaApi(user2.userId);
  });

  it(
    'C387506 User created in Member tenant is logging right into Member tenant (consortia) (thunderjet)',
    { tags: ['smokeECS', 'thunderjet', 'C387506'] },
    () => {
      cy.wait(3000);
      cy.login(user1.username.toLowerCase(), user1.password, {
        path: TopMenu.usersPath,
        waiter: Users.waitLoading,
      });
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      cy.logout();
      cy.wait(5000);

      cy.login(user2.username.toUpperCase(), user2.password, {
        path: TopMenu.usersPath,
        waiter: Users.waitLoading,
      });
      ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
    },
  );
});
