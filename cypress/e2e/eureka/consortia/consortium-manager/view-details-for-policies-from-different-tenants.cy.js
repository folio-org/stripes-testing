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
      centralPolicyName: `AT_C514966_AuthPolicy_Central_${randomPostfix}`,
      collegePolicyName: `AT_C514966_AuthPolicy_College_${randomPostfix}`,
      startDateTime: `${new Date().getFullYear()}-01-01T00:00:00Z`,
      expiresDateTime: `${new Date().getFullYear() + 1}-12-01T00:00:00Z`,
    };
    const capabSetsToAssignCentral = [
      CapabilitySets.uiAuthorizationPoliciesSettingsAdmin,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerView,
    ];
    const capabSetsToAssignCollege = [CapabilitySets.uiAuthorizationPoliciesSettingsAdmin];
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
            testData.policyCentralId = policyCentral.body.id;
          });
          cy.setTenant(Affiliations.College);
          cy.assignCapabilitiesToExistingUser(userData.userId, [], capabSetsToAssignCollege);
          cy.createAuthorizationPolicyApi(policyBodyCollege, false).then((policyCollege) => {
            testData.policyCollegeId = policyCollege.body.id;
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
    });

    it(
      'C514966 ECS | Eureka | Verify detail view of selected Authorization policy (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C514966'] },
      () => {
        cy.resetTenant();
        cy.login(userData.username, userData.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_POLICIES);
        AuthorizationPolicies.checkNewButtonShown(false);
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.verifyAvailableTenants([tenantNames.central, tenantNames.college].sort());
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.saveAndClose();
        ConsortiumManagerApp.verifyMembersSelected(2);

        SelectMembers.selectMember(tenantNames.central);
        AuthorizationPolicies.checkPolicyFound(testData.centralPolicyName);
        AuthorizationPolicies.checkPolicyFound(testData.collegePolicyName, false);
        AuthorizationPolicies.waitContentLoading();
        AuthorizationPolicies.searchPolicy(testData.centralPolicyName);
        AuthorizationPolicies.clickOnPolicyName(testData.centralPolicyName);
        AuthorizationPolicies.verifyPolicyViewPane(
          testData.centralPolicyName,
          policyBody.description,
        );
        AuthorizationPolicies.checkActionsButtonShownForPolicy(testData.centralPolicyName, false);
        AuthorizationPolicies.closePolicyDetailView(testData.centralPolicyName);
        AuthorizationPolicies.clearSearchField();

        SelectMembers.selectMember(tenantNames.college);
        AuthorizationPolicies.checkPolicyFound(testData.centralPolicyName, false);
        AuthorizationPolicies.checkPolicyFound(testData.collegePolicyName);
        AuthorizationPolicies.waitContentLoading();
        AuthorizationPolicies.searchPolicy(testData.collegePolicyName);
        AuthorizationPolicies.clickOnPolicyName(testData.collegePolicyName);
        AuthorizationPolicies.verifyPolicyViewPane(
          testData.collegePolicyName,
          policyBody.description,
        );
        AuthorizationPolicies.checkActionsButtonShownForPolicy(testData.collegePolicyName, false);
      },
    );
  });
});
