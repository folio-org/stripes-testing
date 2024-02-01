import uuid from 'uuid';
import permissions from '../../../../../support/dictionary/permissions';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import PatronGroups from '../../../../../support/fragments/settings/users/patronGroups';
import PatronGroupsConcortiumManager from '../../../../../support/fragments/consortium-manager/users/patronGroupsConcortiumManager';

const testData = {
  centralSharedPatronGroup: {
    payload: {
      group: getTestEntityValue('centralSharedPatronGroup_name'),
    },
  },
  centralLocalPatronGroup: {
    id: uuid(),
    name: getTestEntityValue('centralLocalPatronGroup_name'),
  },
  collegeLocalPatronGroup: {
    id: uuid(),
    name: getTestEntityValue('collegeLocalPatronGroup_name'),
  },
  universityLocalPatronGroup: {
    id: uuid(),
    name: getTestEntityValue('universityLocalPatronGroup_name'),
  },
};

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Patron groups', () => {
      before('create test data', () => {
        cy.getAdminToken();
        PatronGroupsConcortiumManager.createViaApi(testData.centralSharedPatronGroup).then(
          (newPatronGroup) => {
            testData.centralSharedPatronGroup = newPatronGroup;
          },
        );
        PatronGroups.createViaApi(testData.centralLocalPatronGroup.name).then((response) => {
          testData.centralLocalPatronGroup.id = response;
        });

        cy.createTempUser([
          permissions.consortiaSettingsConsortiumManagerView.gui,
          permissions.uiUsersViewPatronGroups.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            permissions.uiUsersViewPatronGroups.gui,
          ]);
          PatronGroups.createViaApi(testData.collegeLocalPatronGroup.name).then((response) => {
            testData.collegeLocalPatronGroup.id = response;
          });

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            permissions.uiUsersCreatePatronGroups.gui,
          ]);
          PatronGroups.createViaApi(testData.universityLocalPatronGroup.name).then((response) => {
            testData.universityLocalPatronGroup.id = response;
          });

          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password);
          // Without waiter, permissions aren't loading
          cy.wait(10000);
          TopMenuNavigation.navigateToApp('Consortium manager');
          ConsortiumManagerApp.waitLoading();
        });
      });

      after('delete test data', () => {
        cy.setTenant(Affiliations.University);
        cy.getUniversityAdminToken();
        PatronGroups.deleteViaApi(testData.universityLocalPatronGroup.id);

        cy.resetTenant();
        cy.getAdminToken();

        cy.setTenant(Affiliations.College);
        cy.getCollegeAdminToken();
        PatronGroups.deleteViaApi(testData.collegeLocalPatronGroup.id);

        cy.setTenant(Affiliations.Consortia);
        cy.getAdminToken();
        PatronGroups.deleteViaApi(testData.centralLocalPatronGroup.id);
        PatronGroupsConcortiumManager.deleteViaApi(testData.centralSharedPatronGroup);
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C407753 User with "Consortium manager: Can view existing settings" permission is able to view the list of patron groups of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          PatronGroupsConcortiumManager.choose();
          PatronGroupsConcortiumManager.verifyGroupInTheList(
            testData.centralSharedPatronGroup.payload.group,
            'All',
          );
          PatronGroupsConcortiumManager.verifyGroupInTheList(
            testData.centralLocalPatronGroup.name,
            tenantNames.central,
          );

          PatronGroupsConcortiumManager.verifyGroupInTheList(
            testData.collegeLocalPatronGroup.name,
            tenantNames.college,
          );
          PatronGroupsConcortiumManager.verifyGroupInTheList(
            testData.universityLocalPatronGroup.name,
            tenantNames.university,
            'edit',
            'trash',
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3);
          SelectMembers.selectMembers(tenantNames.central);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(2);
          PatronGroupsConcortiumManager.verifyGroupInTheList(
            testData.centralSharedPatronGroup.payload.group,
            'All',
          );
          PatronGroupsConcortiumManager.verifyNoGroupInTheList(
            testData.centralLocalPatronGroup.name,
          );

          PatronGroupsConcortiumManager.verifyGroupInTheList(
            testData.collegeLocalPatronGroup.name,
            tenantNames.college,
          );
          PatronGroupsConcortiumManager.verifyGroupInTheList(
            testData.universityLocalPatronGroup.name,
            tenantNames.university,
            'edit',
            'trash',
          );
        },
      );
    });
  });
});
