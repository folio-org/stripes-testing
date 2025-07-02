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
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      centralPolicyName: `AT_C552480_AuthPolicy_Central_${randomPostfix}`,
      collegePolicyName: `AT_C552480_AuthPolicy_College_${randomPostfix}`,
      universityPolicyName: `AT_C552480_AuthPolicy_University_${randomPostfix}`,
      startDateTime: `${new Date().getFullYear()}-01-01T00:00:00Z`,
      expiresDateTime: `${new Date().getFullYear() + 1}-12-01T00:00:00Z`,
    };
    const capabSetsToAssignCentral = [
      {
        type: CAPABILITY_TYPES.DATA,
        resource: 'UI-Consortia-Settings Consortium-Manager',
        action: CAPABILITY_ACTIONS.VIEW,
      },
      {
        type: CAPABILITY_TYPES.SETTINGS,
        resource: 'UI-Authorization-Policies Settings Admin',
        action: CAPABILITY_ACTIONS.VIEW,
      },
    ];
    const capabSetsToAssignMember1 = [
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
          cy.createAuthorizationPolicyApi(policyBodyCentral).then((policyCentral) => {
            testData.policyCentralId = policyCentral.body.id;
          });
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignMember1);
          cy.createAuthorizationPolicyApi(policyBodyCollege).then((policyCollege) => {
            testData.policyCollegeId = policyCollege.body.id;
          });
          cy.setTenant(Affiliations.University);
          // Note: User has NO capabilities assigned in Member 2 (University)
          cy.createAuthorizationPolicyApi(policyBodyUniversity).then((policyUniversity) => {
            testData.policyUniversityId = policyUniversity.body.id;
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
      cy.setTenant(Affiliations.University);
      cy.deleteAuthorizationPolicyApi(testData.policyUniversityId);
    });

    it(
      'C552480 ECS | Eureka | User with insufficient capability sets for member tenant is not able to view authorization policies associated to that tenant (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C552480'] },
      () => {
        // Step 1: Go to Consortium manager and click on Authorization policies
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();

        // Step 2: Select all members
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([
          tenantNames.central,
          tenantNames.college,
          tenantNames.university,
        ]);
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.checkMember(tenantNames.university, true);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(3);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_POLICIES);
        AuthorizationPolicies.waitContentLoading();

        // Step 3: Expand Member dropdown and verify available tenants
        ConsortiumManagerApp.verifyTenantsInDropdown([
          tenantNames.central,
          tenantNames.college,
          tenantNames.university,
        ]);

        // Step 4: Select Member 2 (University) tenant - should show error
        InteractorsTools.closeAllVisibleCallouts();
        SelectMembers.selectMember(tenantNames.university);
        AuthorizationPolicies.verifyAccessErrorShown();
        AuthorizationPolicies.verifyPoliciesCount(0);

        // Step 5: Unselect Member 2 tenant
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.checkMember(tenantNames.university, false);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(2);

        // Step 6: Expand Member dropdown and verify only Central and Member 1 are available
        ConsortiumManagerApp.verifyTenantsInDropdown([tenantNames.central, tenantNames.college]);

        // Steps 7, 8: Verify that Central and Member 1 tenants work correctly
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationPolicies.waitContentLoading();
        AuthorizationPolicies.checkPolicyFound(testData.centralPolicyName);
        AuthorizationPolicies.checkPolicyFound(testData.collegePolicyName, false);
        AuthorizationPolicies.checkPolicyFound(testData.universityPolicyName, false);

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationPolicies.waitContentLoading();
        AuthorizationPolicies.checkPolicyFound(testData.centralPolicyName, false);
        AuthorizationPolicies.checkPolicyFound(testData.collegePolicyName);
        AuthorizationPolicies.checkPolicyFound(testData.universityPolicyName, false);
      },
    );
  });
});
