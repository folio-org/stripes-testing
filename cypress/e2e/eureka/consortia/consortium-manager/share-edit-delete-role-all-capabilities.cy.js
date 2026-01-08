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
} from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import UsersCard from '../../../../support/fragments/users/usersCard';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      roleName: `AT_C965846_UserRole_${randomPostfix}`,
      capabilitySetsToRemove: [
        {
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Orders Orders',
          action: CAPABILITY_ACTIONS.VIEW,
        },
        {
          table: CAPABILITY_TYPES.DATA,
          resource: 'UI-Invoice Invoice',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ],
      capabilityColumns: [
        {
          type: CAPABILITY_TYPES.DATA,
          action: CAPABILITY_ACTIONS.VIEW,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          action: CAPABILITY_ACTIONS.EDIT,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          action: CAPABILITY_ACTIONS.CREATE,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          action: CAPABILITY_ACTIONS.DELETE,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          action: CAPABILITY_ACTIONS.MANAGE,
        },
        {
          type: CAPABILITY_TYPES.SETTINGS,
          action: CAPABILITY_ACTIONS.VIEW,
        },
        {
          type: CAPABILITY_TYPES.SETTINGS,
          action: CAPABILITY_ACTIONS.EDIT,
        },
        {
          type: CAPABILITY_TYPES.SETTINGS,
          action: CAPABILITY_ACTIONS.CREATE,
        },
        {
          type: CAPABILITY_TYPES.SETTINGS,
          action: CAPABILITY_ACTIONS.DELETE,
        },
        {
          type: CAPABILITY_TYPES.SETTINGS,
          action: CAPABILITY_ACTIONS.MANAGE,
        },
        {
          type: CAPABILITY_TYPES.PROCEDURAL,
          action: CAPABILITY_ACTIONS.EXECUTE,
        },
      ],
    };
    let assignUserCentralData1;
    let assignUserCentralData2;
    let assignUserCollegeData1;
    let assignUserCollegeData2;
    let capabilitiesCountCentral;
    let capabilitySetsCountCentral;
    let capabilityIdsCentral;
    let capabilitySetIdsCentral;

    before('Create users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      cy.then(() => {
        cy.getCapabilitiesApi(5000, true, { customTimeout: 60_000 }).then((capabs) => {
          capabilitiesCountCentral = capabs.length;
          capabilityIdsCentral = capabs.map((capab) => capab.id);
        });
        cy.getCapabilitySetsApi().then((capabSets) => {
          capabilitySetsCountCentral = capabSets.length;
          capabilitySetIdsCentral = capabSets.map((capabSet) => capabSet.id);
        });
        cy.createTempUser([]).then((userProperties) => {
          assignUserCentralData1 = userProperties;
        });
        cy.createTempUser([]).then((userProperties) => {
          assignUserCentralData2 = userProperties;
        });
      })
        .then(() => {
          cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
            testData.roleId = role.id;
            cy.addCapabilitySetsToNewRoleApi(testData.roleId, capabilitySetIdsCentral, {
              customTimeout: 120_000,
            }).then(() => {
              cy.addCapabilitiesToNewRoleApi(testData.roleId, capabilityIdsCentral, {
                customTimeout: 120_000,
              }).then(() => {
                cy.shareRoleWithCapabilitiesApi({
                  id: testData.roleId,
                  name: testData.roleName,
                  customTimeout: 120_000,
                });
              });
            });
          });
        })
        .then(() => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.createTempUser([]).then((userProperties) => {
            assignUserCollegeData1 = userProperties;
          });
          cy.createTempUser([]).then((userProperties) => {
            assignUserCollegeData2 = userProperties;
          });
        })
        .then(() => {
          cy.resetTenant();
          cy.addRolesToNewUserApi(assignUserCentralData1.userId, [testData.roleId]);
          cy.addRolesToNewUserApi(assignUserCentralData2.userId, [testData.roleId]);
        });
    });

    after('Delete users, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(assignUserCentralData1.userId);
      Users.deleteViaApi(assignUserCentralData2.userId);
      cy.deleteSharedRoleApi({ id: testData.roleId, name: testData.roleName }, true);
      cy.deleteAuthorizationRoleApi(testData.roleId, true);
      cy.setTenant(Affiliations.College);
      Users.deleteViaApi(assignUserCollegeData1.userId);
      Users.deleteViaApi(assignUserCollegeData2.userId);
    });

    it(
      'C965846 ECS | Share an authorization role with all capabilities assigned, then edit and delete it after sharing (consortia) (thunderjet)',
      { tags: ['criticalPathECS', 'thunderjet', 'eureka', 'C965846'] },
      () => {
        cy.resetTenant();
        cy.loginAsAdmin();
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
        ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
        ConsortiumManagerApp.verifyStatusOfConsortiumManager();
        ConsortiumManagerApp.clickSelectMembers();
        SelectMembers.checkMember(tenantNames.central, true);
        SelectMembers.checkMember(tenantNames.college, true);
        SelectMembers.checkMember(tenantNames.university, true);
        SelectMembers.saveAndClose();
        SelectMembers.selectMember(tenantNames.central);
        AuthorizationRoles.waitContentLoading();

        // AuthorizationRoles.clickActionsButton();
        // AuthorizationRoles.clickNewButton();
        // AuthorizationRoles.fillRoleNameDescription(testData.roleName);
        // AuthorizationRoles.clickSelectApplication();
        // AuthorizationRoles.selectAllApplicationsInModal();
        // AuthorizationRoles.clickSaveInModal();
        // AuthorizationRoles.checkCapabilitySpinnersAbsent();
        // testData.capabilityColumns.forEach((capabilityColumn) => {
        //   AuthorizationRoles.selectCapabilitySetColumn(
        //     capabilityColumn.type,
        //     capabilityColumn.action,
        //   );
        //   cy.wait(10);
        // });
        // testData.capabilityColumns.forEach((capabilityColumn) => {
        //   AuthorizationRoles.selectCapabilityColumn(
        //     capabilityColumn.type,
        //     capabilityColumn.action,
        //   );
        //   cy.wait(10);
        // });
        // cy.intercept('POST', '/roles/capabilities*').as('capabilitiesCall');
        // cy.intercept('POST', '/roles/capability-sets*').as('capabilitySetsCall');
        // AuthorizationRoles.clickSaveButton();
        cy.then(() => {
          // cy.wait('@capabilitiesCall', { timeout: 120_000 }).then((callCapabs) => {
          //   expect(callCapabs.response.statusCode).to.eq(201);
          // });
          // cy.wait('@capabilitySetsCall', { timeout: 120_000 }).then((callCapabSets) => {
          //   expect(callCapabSets.response.statusCode).to.eq(201);
          //   expect(callCapabSets.request.body.capabilitySetIds).to.have.lengthOf(
          //     capabilitySetsCountCentral,
          //   );
          // });
        }).then(() => {
          // AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
          // AuthorizationRoles.verifyRoleViewPane(testData.roleName);
          // AuthorizationRoles.checkCapabilitySetsAccordionCounter(`${capabilitySetsCountCentral}`);
          // AuthorizationRoles.checkCapabilitiesAccordionCounter(`${capabilitiesCountCentral}`);
          // AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName, false);

          // AuthorizationRoles.clickAssignUsersButton();
          // AuthorizationRoles.selectUserInModal(assignUserCentralData1.username);
          // AuthorizationRoles.selectUserInModal(assignUserCentralData2.username);
          // AuthorizationRoles.clickSaveInAssignModal();
          // AuthorizationRoles.checkUsersAccordion(2);
          // AuthorizationRoles.verifyAssignedUser(
          //   assignUserCentralData1.lastName,
          //   assignUserCentralData1.firstName,
          // );
          // AuthorizationRoles.verifyAssignedUser(
          //   assignUserCentralData2.lastName,
          //   assignUserCentralData2.firstName,
          // );

          // AuthorizationRoles.shareRole(testData.roleName, { customTimeout: 120_000 });

          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);

          AuthorizationRoles.checkCapabilitySetsAccordionCounter(`${capabilitySetsCountCentral}`);
          AuthorizationRoles.checkCapabilitiesAccordionCounter(`${capabilitiesCountCentral}`);
          AuthorizationRoles.verifyAssignedUser(
            assignUserCentralData1.lastName,
            assignUserCentralData1.firstName,
          );
          AuthorizationRoles.verifyAssignedUser(
            assignUserCentralData2.lastName,
            assignUserCentralData2.firstName,
          );

          SelectMembers.selectMember(tenantNames.university);
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName);
          AuthorizationRoles.verifyAssignedUsersAccordionEmpty();

          SelectMembers.selectMember(tenantNames.college);
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName);
          AuthorizationRoles.verifyAssignedUsersAccordionEmpty();

          AuthorizationRoles.clickAssignUsersButton();
          AuthorizationRoles.selectUserInModal(assignUserCollegeData1.username);
          AuthorizationRoles.selectUserInModal(assignUserCollegeData2.username);
          AuthorizationRoles.clickSaveInAssignModal();
          AuthorizationRoles.checkUsersAccordion(2);
          AuthorizationRoles.verifyAssignedUser(
            assignUserCollegeData1.lastName,
            assignUserCollegeData1.firstName,
          );
          AuthorizationRoles.verifyAssignedUser(
            assignUserCollegeData2.lastName,
            assignUserCollegeData2.firstName,
          );

          SelectMembers.selectMember(tenantNames.central);
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName);

          AuthorizationRoles.openForEdit(testData.roleName);
          testData.capabilitySetsToRemove.forEach((set) => {
            AuthorizationRoles.selectCapabilitySetCheckbox(set, false);
          });
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.verifyRoleViewPane(testData.roleName);
          AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName);
          AuthorizationRoles.checkCapabilitySetsAccordionCounter(
            `${capabilitySetsCountCentral - testData.capabilitySetsToRemove.length}`,
          );
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          testData.capabilitySetsToRemove.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxAbsent(set);
          });

          SelectMembers.selectMember(tenantNames.college);
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName);
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          testData.capabilitySetsToRemove.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxAbsent(set);
          });

          SelectMembers.selectMember(tenantNames.university);
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName);
          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          testData.capabilitySetsToRemove.forEach((set) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxAbsent(set);
          });

          SelectMembers.selectMember(tenantNames.central);
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);
          AuthorizationRoles.checkRoleCentrallyManaged(testData.roleName);
          AuthorizationRoles.clickDeleteRole(testData.roleName);
          AuthorizationRoles.confirmDeleteRole(testData.roleName);

          SelectMembers.selectMember(tenantNames.college);
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.checkRoleFound(testData.roleName, false);

          SelectMembers.selectMember(tenantNames.university);
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.checkRoleFound(testData.roleName, false);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
          Users.waitLoading();
          UsersSearchPane.searchByUsername(assignUserCentralData1.username);
          UsersSearchPane.openUser(assignUserCentralData1.username);
          UsersCard.verifyUserRolesCounter('0');
          UsersCard.close();
          UsersSearchPane.searchByUsername(assignUserCentralData2.username);
          UsersSearchPane.openUser(assignUserCentralData2.username);
          UsersCard.verifyUserRolesCounter('0');
        });
      },
    );
  });
});
