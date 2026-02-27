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
      centralPolicyName: `AT_C514962_AuthPolicy_${randomPostfix} CentralOne`,
      centralPolicyName2: `AT_C514962_AuthPolicy_${randomPostfix} CentralTwo`,
      collegePolicyName: `AT_C514962_AuthPolicy_${randomPostfix} CollegeOne`,
      collegePolicyName2: `AT_C514962_AuthPolicy_${randomPostfix} CollegeTwo`,
      queryPostfix: '#$%',
      queryPrefix: '#$%*',
      queryMiddlePart: '$%*&^',
      startDateTime: `${new Date().getFullYear()}-01-01T00:00:00Z`,
      expiresDateTime: `${new Date().getFullYear() + 1}-12-01T00:00:00Z`,
    };
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
    const policyBodyCentral2 = { ...policyBody, name: testData.centralPolicyName2 };
    const policyBodyCollege = { ...policyBody, name: testData.collegePolicyName };
    const policyBodyCollege2 = { ...policyBody, name: testData.collegePolicyName2 };
    const searchQueriesCentral = {
      exact: testData.centralPolicyName,
      incomplete: testData.centralPolicyName.slice(0, -3),
      nonExact1: testData.centralPolicyName + testData.queryPostfix,
      nonExact2: testData.queryPrefix + testData.centralPolicyName,
      nonExact3: testData.centralPolicyName
        .split(' ')
        .toSpliced(testData.centralPolicyName.split(' ').length - 1, 0, testData.queryMiddlePart)
        .join(' '),
    };
    const searchQueriesCollege = {
      exact: testData.collegePolicyName,
      incomplete: testData.collegePolicyName.slice(0, -3),
      nonExact1: testData.collegePolicyName + testData.queryPostfix,
      nonExact2: testData.queryPrefix + testData.collegePolicyName,
      nonExact3: testData.collegePolicyName
        .split(' ')
        .toSpliced(testData.collegePolicyName.split(' ').length - 1, 0, testData.queryMiddlePart)
        .join(' '),
    };
    const capabSetsToAssignCentral = [
      CapabilitySets.uiAuthorizationPoliciesSettingsAdmin,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerView,
    ];
    const capabSetsToAssignCollege = [CapabilitySets.uiAuthorizationPoliciesSettingsAdmin];
    const policyCentralIds = [];
    const policyCollegeIds = [];
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
          cy.createAuthorizationPolicyApi(policyBodyCentral, false).then((policyCentral) => {
            policyCentralIds.push(policyCentral.body.id);
          });
          cy.createAuthorizationPolicyApi(policyBodyCentral2, false).then((policyCentral2) => {
            policyCentralIds.push(policyCentral2.body.id);
          });
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCollege);
          cy.createAuthorizationPolicyApi(policyBodyCollege, false).then((policyCollege) => {
            policyCollegeIds.push(policyCollege.body.id);
          });
          cy.createAuthorizationPolicyApi(policyBodyCollege2, false).then((policyCollege2) => {
            policyCollegeIds.push(policyCollege2.body.id);
          });
        });
    });

    after('Delete users data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
      policyCentralIds.forEach((policyId) => {
        cy.deleteAuthorizationPolicyApi(policyId);
      });
      cy.setTenant(Affiliations.College);
      policyCollegeIds.forEach((policyId) => {
        cy.deleteAuthorizationPolicyApi(policyId);
      });
    });

    it(
      'C514962 ECS | Eureka | User is able to filter Authorization policies in Consortium manager from different tenants (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C514962'] },
      () => {
        cy.resetTenant();
        cy.waitForAuthRefresh(() => {
          cy.login(userData.username, userData.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        });
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_POLICIES);
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college].sort());
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, false);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(1);

        SelectMembers.selectMember(tenantNames.central);
        AuthorizationPolicies.waitContentLoading();
        AuthorizationPolicies.checkPolicyFound(testData.centralPolicyName);
        AuthorizationPolicies.checkPolicyFound(testData.collegePolicyName, false);
        AuthorizationPolicies.searchPolicy(searchQueriesCentral.exact);
        AuthorizationPolicies.verifyPoliciesCount(1);
        AuthorizationPolicies.checkPolicyFound(testData.centralPolicyName);
        AuthorizationPolicies.searchPolicy(searchQueriesCentral.incomplete);
        AuthorizationPolicies.verifyPoliciesCount(2);
        AuthorizationPolicies.checkPolicyFound(testData.centralPolicyName);
        AuthorizationPolicies.checkPolicyFound(testData.centralPolicyName2);
        [
          searchQueriesCentral.nonExact1,
          searchQueriesCentral.nonExact2,
          searchQueriesCentral.nonExact3,
        ].forEach((searchQuery) => {
          AuthorizationPolicies.searchPolicy(searchQuery);
          AuthorizationPolicies.verifyPoliciesCount(0);
        });
        AuthorizationPolicies.searchPolicy(testData.collegePolicyName);
        AuthorizationPolicies.verifyPoliciesCount(0);

        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(2);
        SelectMembers.selectMember(tenantNames.college);
        AuthorizationPolicies.waitContentLoading();
        AuthorizationPolicies.checkPolicyFound(testData.collegePolicyName);
        AuthorizationPolicies.checkPolicyFound(testData.centralPolicyName, false);
        AuthorizationPolicies.searchPolicy(searchQueriesCollege.exact);
        AuthorizationPolicies.verifyPoliciesCount(1);
        AuthorizationPolicies.checkPolicyFound(testData.collegePolicyName);
        AuthorizationPolicies.searchPolicy(searchQueriesCollege.incomplete);
        AuthorizationPolicies.verifyPoliciesCount(2);
        AuthorizationPolicies.checkPolicyFound(testData.collegePolicyName);
        AuthorizationPolicies.checkPolicyFound(testData.collegePolicyName2);
        [
          searchQueriesCollege.nonExact1,
          searchQueriesCollege.nonExact2,
          searchQueriesCollege.nonExact3,
        ].forEach((searchQuery) => {
          AuthorizationPolicies.searchPolicy(searchQuery);
          AuthorizationPolicies.verifyPoliciesCount(0);
        });
        AuthorizationPolicies.searchPolicy(testData.centralPolicyName);
        AuthorizationPolicies.verifyPoliciesCount(0);
      },
    );
  });
});
