import Users from '../../../../support/fragments/users/users';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  AUTHORIZATION_POLICY_TYPES,
  AUTHORIZATION_POLICY_SOURCES,
} from '../../../../support/constants';
import AuthorizationPolicies, {
  SETTINGS_SUBSECTION_AUTH_POLICIES,
} from '../../../../support/fragments/settings/authorization-policies/authorizationPolicies';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      centralPolicyName: `AT_C552519_AuthPolicy_Central_${randomPostfix}`,
      collegePolicyName: `AT_C552519_AuthPolicy_College_${randomPostfix}`,
      startDateTime: `${new Date().getFullYear()}-01-01T00:00:00Z`,
      expiresDateTime: `${new Date().getFullYear() + 1}-12-01T00:00:00Z`,
    };
    const capabSetsToAssignCentral = [CapabilitySets.uiConsortiaSettingsConsortiumManagerView];
    const capabSetsToAssignMembers = [CapabilitySets.uiAuthorizationPoliciesSettingsAdmin];
    const policyBody = {
      description: 'Test policy description',
      type: AUTHORIZATION_POLICY_TYPES.TIME.toUpperCase(),
      timePolicy: {
        repeat: false,
        start: testData.startDateTime,
        expires: testData.expiresDateTime,
        dayOfMonthStart: 5,
        dayOfMonthEnd: 20,
        monthStart: 1,
        monthEnd: 12,
        hourStart: 8,
        hourEnd: 17,
        minuteStart: 0,
        minuteEnd: 30,
      },
      source: AUTHORIZATION_POLICY_SOURCES.USER,
    };
    const policyBodyCentral = { ...policyBody, name: testData.centralPolicyName };
    const policyBodyCollege = { ...policyBody, name: testData.collegePolicyName };
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
          cy.createAuthorizationPolicyApi(policyBodyCentral, false).then((policyCentral) => {
            testData.policyCentralId = policyCentral.body.id;
          });
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignMembers);
          cy.createAuthorizationPolicyApi(policyBodyCollege, false).then((policyCollege) => {
            testData.policyCollegeId = policyCollege.body.id;
          });
        });
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      cy.deleteAuthorizationPolicyApi(testData.policyCentralId);
      cy.setTenant(Affiliations.College);
      cy.deleteAuthorizationPolicyApi(testData.policyCollegeId);
    });

    it(
      'C552519 ECS | Eureka | User with insufficient capability sets for Central tenant is not able to view authorization policies associated to that tenant (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C552519'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        SelectMembers.selectAllMembers();
        ConsortiumManagerApp.verifyMembersSelected(2);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_POLICIES);
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationPolicies.verifyAccessErrorShown();
        AuthorizationPolicies.waitLoading();
        AuthorizationPolicies.verifyPoliciesCount(0);

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationPolicies.checkPolicyFound(testData.centralPolicyName, false);
        AuthorizationPolicies.checkPolicyFound(testData.collegePolicyName);
      },
    );
  });
});
