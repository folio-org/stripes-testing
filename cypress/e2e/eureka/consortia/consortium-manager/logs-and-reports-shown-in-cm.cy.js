import Users from '../../../../support/fragments/users/users';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
} from '../../../../support/constants';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const capabSetsToAssign = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Roles Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    let userData;

    before('Create user', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((userProperties) => {
        userData = userProperties;
        cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssign);
      });
    });

    after('Delete user', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C552368 ECS | Eureka | Verify "Logs & reports" section is displayed in Consortium manager (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C552368'] },
      () => {
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.verifyManagementPane();
        ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();
        SelectMembers.selectAllMembers();
        ConsortiumManagerApp.verifyMembersSelected(1);
        ConsortiumManagerApp.waitLoading();
        ConsortiumManagerApp.toggleManagementPane(false);
        ConsortiumManagerApp.toggleManagementPane(true);
      },
    );
  });
});
