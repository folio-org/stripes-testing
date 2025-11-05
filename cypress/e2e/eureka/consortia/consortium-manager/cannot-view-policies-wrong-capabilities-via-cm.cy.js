import Users from '../../../../support/fragments/users/users';
import ConsortiumManager from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES } from '../../../../support/constants';
import AuthorizationPolicies, {
  SETTINGS_SUBSECTION_AUTH_POLICIES,
} from '../../../../support/fragments/settings/authorization-policies/authorizationPolicies';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const capabSetsToAssignCentral = [CapabilitySets.uiConsortiaSettingsConsortiumManagerView];
    const capabSetsToAssignMembers = [CapabilitySets.uiAuthorizationRolesSettingsAdmin];
    let userData;

    before('Create user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCentral);
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.assignAffiliationToUser(Affiliations.University, userData.userId);
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignMembers);
          cy.setTenant(Affiliations.University);
          cy.wait(10_000);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignMembers);
        });
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C514961 ECS | Eureka | A user with not appropriate capabilities is not able to view authorization policies (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C514961'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManager.verifyStatusOfConsortiumManager();
        SelectMembers.selectAllMembers();
        ConsortiumManager.verifyMembersSelected(3);
        ConsortiumManager.openListInSettings(SETTINGS_SUBSECTION_AUTH_POLICIES);
        AuthorizationPolicies.verifyAccessErrorShown();
        AuthorizationPolicies.verifyPoliciesCount(0);

        ConsortiumManager.clickSelectMembers();
        SelectMembers.checkMember(tenantNames.central, false);
        SelectMembers.checkMember(tenantNames.college, false);
        SelectMembers.saveAndClose();

        AuthorizationPolicies.verifyAccessErrorShown();
        AuthorizationPolicies.verifyPoliciesCount(0);
      },
    );
  });
});
