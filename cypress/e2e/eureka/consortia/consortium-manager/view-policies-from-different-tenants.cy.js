import Users from '../../../../support/fragments/users/users';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
  AUTHORIZATION_POLICY_TYPES,
  AUTHORIZATION_POLICY_SOURCES,
} from '../../../../support/constants';
import AuthorizationPolicies, {
  SETTINGS_SUBSECTION_AUTH_POLICIES,
} from '../../../../support/fragments/settings/authorization-policies/authorizationPolicies';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      centralPolicyName: `AT_C514964_AuthPolicy_Central_${randomPostfix}`,
      collegePolicyName: `AT_C514964_AuthPolicy_College_${randomPostfix}`,
      universityPolicyName: `AT_C514964_AuthPolicy_University_${randomPostfix}`,
      startDateTime: `${new Date().getFullYear()}-01-01T00:00:00Z`,
      expiresDateTime: `${new Date().getFullYear() + 1}-12-01T00:00:00Z`,
    };
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Policies Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabSetsToAssignMembers = [
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Policies Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
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
    const policyBodyUniversity = { ...policyBody, name: testData.universityPolicyName };
    let userData;

    before('Create users data', () => {
      cy.getAdminToken();
      cy.createTempUser([])
        .then((userProperties) => {
          userData = userProperties;
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCentral);
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, userData.userId);
          cy.assignAffiliationToUser(Affiliations.University, userData.userId);
          cy.createAuthorizationPolicyApi(policyBodyCentral, false).then((policyCentral) => {
            testData.policyCentralId = policyCentral.body.id;
          });
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignMembers);
          cy.createAuthorizationPolicyApi(policyBodyCollege, false).then((policyCollege) => {
            testData.policyCollegeId = policyCollege.body.id;
          });
          cy.setTenant(Affiliations.University);
          cy.wait(10000);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignMembers);
          cy.createAuthorizationPolicyApi(policyBodyUniversity, false).then((policyUniversity) => {
            testData.policyUniversityId = policyUniversity.body.id;
          });
        });
    });

    after('Delete users data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      cy.deleteAuthorizationPolicyApi(testData.policyCentralId);
      cy.setTenant(Affiliations.College);
      cy.deleteAuthorizationPolicyApi(testData.policyCollegeId);
      cy.setTenant(Affiliations.University);
      cy.deleteAuthorizationPolicyApi(testData.policyUniversityId);
    });

    it(
      'C514964 ECS | Eureka | A user with appropriate role can view authorization policies from different tenants (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C514964'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants(
          [tenantNames.central, tenantNames.college, tenantNames.university].sort(),
        );
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, false);
        SelectMembers.checkMember(tenantNames.university, false);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(1);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_POLICIES);
        SelectMembers.selectMember(tenantNames.central);
        cy.resetTenant();
        cy.getAuthorizationPoliciesApi().then((policiesCentral) => {
          AuthorizationPolicies.verifyPoliciesCount(policiesCentral.length);
          AuthorizationPolicies.checkPolicyFound(testData.centralPolicyName);
          AuthorizationPolicies.checkPolicyFound(testData.collegePolicyName, false);
          AuthorizationPolicies.checkPolicyFound(testData.universityPolicyName, false);

          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyMembersSelected(3);
          SelectMembers.selectMember(tenantNames.college);
          cy.setTenant(Affiliations.College);
          cy.getAuthorizationPoliciesApi().then((policiesCollege) => {
            AuthorizationPolicies.verifyPoliciesCount(policiesCollege.length);
            AuthorizationPolicies.checkPolicyFound(testData.centralPolicyName, false);
            AuthorizationPolicies.checkPolicyFound(testData.collegePolicyName);
            AuthorizationPolicies.checkPolicyFound(testData.universityPolicyName, false);

            SelectMembers.selectMember(tenantNames.university);
            cy.setTenant(Affiliations.University);
            cy.getAuthorizationPoliciesApi().then((policiesUniversity) => {
              AuthorizationPolicies.verifyPoliciesCount(policiesUniversity.length);
              AuthorizationPolicies.checkPolicyFound(testData.centralPolicyName, false);
              AuthorizationPolicies.checkPolicyFound(testData.collegePolicyName, false);
              AuthorizationPolicies.checkPolicyFound(testData.universityPolicyName);
            });
          });
        });
      },
    );
  });
});
