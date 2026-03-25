import Users from '../../../../support/fragments/users/users';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { getRandomLetters } from '../../../../support/utils/stringTools';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
} from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomString = `C1045994${getRandomLetters(15)}`;
    const testData = {
      roleNames: [
        `and Test${randomString}`,
        `${randomString}Test and`,
        `Test AND staff${randomString}`,
        `testandtest${randomString}`,
        `"test and staff${randomString}"`,
        `"${randomString}test and"`,
        `Test-and_staff${randomString}`,
        `test \\and staff${randomString}`,
        `Test or staff = within${randomString}`,
        `Name==test${randomString}`,
      ],
      roleCapabilitySets: [
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Invoice Invoice',
          action: CAPABILITY_ACTIONS.CREATE,
        },
      ],
    };
    const createdRoles = testData.roleNames.map((name) => ({ name }));
    const capabSetsToAssignCentral = [
      CapabilitySets.uiAuthorizationRolesSettingsEdit,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
      CapabilitySets.consortiaSharingRolesAllItemCreate,
    ];
    const capabSetsToAssignMembers = [
      CapabilitySets.uiAuthorizationRolesSettingsEdit,
      CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
    ];
    const capabSetIds = [];
    let testUser;

    testData.roleCapabilitySets.forEach((capabilitySet) => {
      capabilitySet.table = capabilitySet.type;
    });

    before('Create users, data', () => {
      cy.getAdminToken();
      cy.then(() => {
        cy.createTempUser([]).then((userProperties) => {
          testUser = userProperties;
        });
      }).then(() => {
        cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignCentral);
        cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
        cy.assignAffiliationToUser(Affiliations.University, testUser.userId);
        createdRoles.forEach((role) => {
          cy.createAuthorizationRoleApi(role.name).then((createdRole) => {
            role.id = createdRole.id;
          });
        });
        testData.roleCapabilitySets.forEach((capabilitySet) => {
          cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
            capabSetIds.push(capabSetId);
          });
        });
        cy.setTenant(Affiliations.College);
        cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMembers);
        cy.setTenant(Affiliations.University);
        cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMembers);
      });
    });

    before('Assign capabilities, role, login', () => {
      cy.resetTenant();
      cy.getAdminToken();
      createdRoles.forEach((role) => {
        cy.addCapabilitySetsToNewRoleApi(role.id, capabSetIds);
      });
      cy.login(testUser.username, testUser.password);
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
      createdRoles.forEach((role) => {
        cy.deleteSharedRoleApi({ id: role.id, name: role.name }, true);
        cy.deleteAuthorizationRoleApi(role.id, true);
      });
    });

    it(
      'C1045994 ECS | Eureka | Share authorization role and edit it from central tenant (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C1045994'] },
      () => {
        function checkRoleInMember(roleName) {
          AuthorizationRoles.searchRole(roleName);
          AuthorizationRoles.clickOnRoleName(roleName);
          AuthorizationRoles.checkRoleCentrallyManaged(roleName, true);
          AuthorizationRoles.checkCapabilitySetsAccordionCounter(
            `${testData.roleCapabilitySets.length}`,
          );
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          testData.roleCapabilitySets.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(set);
          });
          AuthorizationRoles.closeRoleDetailView(roleName);
        }

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        SelectMembers.selectAllMembers();
        ConsortiumManagerApp.waitLoading();
        ConsortiumManagerApp.verifyMembersSelected(3);

        createdRoles.forEach((role, index) => {
          SelectMembers.selectMember(tenantNames.central);
          AuthorizationRoles.waitContentLoading();
          AuthorizationRoles.searchRole(role.name);
          AuthorizationRoles.clickOnRoleName(role.name);
          AuthorizationRoles.checkRoleCentrallyManaged(role.name, false);
          AuthorizationRoles.shareRole(role.name);
          AuthorizationRoles.closeRoleDetailView(role.name);

          if (index % 2) {
            SelectMembers.selectMember(tenantNames.college);
            checkRoleInMember(role.name);
          } else {
            SelectMembers.selectMember(tenantNames.university);
            checkRoleInMember(role.name);
          }
        });
      },
    );
  });
});
