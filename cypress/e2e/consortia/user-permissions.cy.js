import Permissions from '../../support/dictionary/permissions';
import Affiliations from '../../support/dictionary/affiliations';
import Users from '../../support/fragments/users/users';

describe('Consortia', () => {
  let user;

  it('Get permissions', () => {
    cy.getAdminToken();

    // create a new user + set of permissions for default tenant (consortia)
    cy.createTempUser([
      Permissions.consortiaSettingsConsortiaAffiliationsEdit.gui,
      Permissions.consortiaSettingsConsortiaAffiliationsView.gui,
      Permissions.uiUsersPermissionsView.gui,
      Permissions.uiUsersView.gui,
    ])
      .then((userProperties) => {
        user = userProperties;
      })
      .then(() => {
        // assign the second affiliation to just created user (university)
        cy.assignAffiliationToUser(Affiliations.University, user.userId);
        // switch tenant (to the university)
        cy.setTenant(Affiliations.University);
        // assign teh second set of permission to already created user for another affiliation (university)
        cy.assignPermissionsToExistingUser(user.userId, [
          Permissions.consortiaSettingsConsortiaAffiliationsEdit.gui,
          Permissions.consortiaSettingsConsortiaAffiliationsView.gui,
          Permissions.uiUsersPermissionsView.gui,
          Permissions.uiUsersView.gui,
        ]);
      })
      .then(() => {
        // cy.login(user.username, user.password);
      })
      .then(() => {
        // reset tenant to default (consortia), if you want to work with API calls
        // or just switch to Affiliations.Consortia
        cy.resetTenant();
        // cy.setTenant(Affiliations.Consortia);
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });
  });
});
