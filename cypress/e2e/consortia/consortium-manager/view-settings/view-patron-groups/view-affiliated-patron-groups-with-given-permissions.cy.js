import moment from 'moment';
import uuid from 'uuid';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import PatronGroupsConsortiumManager from '../../../../../support/fragments/consortium-manager/users/patronGroupsConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import PatronGroups from '../../../../../support/fragments/settings/users/patronGroups';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

const testData = {
  centralSharedPatronGroup: {
    payload: {
      group: getTestEntityValue('centralSharedPatronGroup_name'),
    },
  },
  centralLocalPatronGroup: {
    id: uuid(),
    name: getTestEntityValue('centralLocalPatronGroup_name'),
    description: 'centralLocalPatronGroup_description',
  },
  collegeLocalPatronGroup: {
    id: uuid(),
    name: getTestEntityValue('collegeLocalPatronGroup_name'),
    description: 'collegeLocalPatronGroup_description',
  },
  universityLocalPatronGroup: {
    id: uuid(),
    name: getTestEntityValue('universityLocalPatronGroup_name'),
    description: 'universityLocalPatronGroup_description',
  },
};

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Patron groups', () => {
      before('create test data', () => {
        cy.getAdminToken();
        PatronGroupsConsortiumManager.createViaApi(testData.centralSharedPatronGroup).then(
          (newPatronGroup) => {
            testData.centralSharedPatronGroup = newPatronGroup;
          },
        );
        PatronGroups.createViaApi(
          testData.centralLocalPatronGroup.name,
          testData.centralLocalPatronGroup.description,
        ).then((response) => {
          testData.centralLocalPatronGroup.id = response;
        });

        cy.createTempUser([
          permissions.consortiaSettingsConsortiumManagerView.gui,
          permissions.uiUsersViewPatronGroups.gui,
        ]).then((userProperties) => {
          // User for test C407753
          testData.user753 = userProperties;

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.College, testData.user753.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user753.userId, [
            permissions.uiUsersViewPatronGroups.gui,
          ]);
          cy.createTempUser([permissions.uiUsersCreateEditRemovePatronGroups.gui])
            .then((user) => {
              // User for test C407754
              testData.user754 = user;
            })
            .then(() => {
              PatronGroups.createViaApi(
                testData.collegeLocalPatronGroup.name,
                testData.collegeLocalPatronGroup.description,
              ).then((response) => {
                testData.collegeLocalPatronGroup.id = response;
              });
              cy.resetTenant();
              cy.getAdminToken();
              cy.assignPermissionsToExistingUser(testData.user754.userId, [
                permissions.consortiaSettingsConsortiumManagerView.gui,
                permissions.uiUsersViewPatronGroups.gui,
              ]);

              cy.resetTenant();
              cy.assignAffiliationToUser(Affiliations.University, testData.user753.userId);
              cy.assignAffiliationToUser(Affiliations.University, testData.user754.userId);
              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(testData.user753.userId, [
                permissions.uiUsersCreateEditRemovePatronGroups.gui,
              ]);
              cy.assignPermissionsToExistingUser(testData.user754.userId, [
                permissions.uiUsersViewPatronGroups.gui,
              ]);
              PatronGroups.createViaApi(
                testData.universityLocalPatronGroup.name,
                testData.universityLocalPatronGroup.description,
              ).then((response) => {
                testData.universityLocalPatronGroup.id = response;
              });
            });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();

        cy.setTenant(Affiliations.University);
        PatronGroups.deleteViaApi(testData.universityLocalPatronGroup.id);

        cy.setTenant(Affiliations.College);
        PatronGroups.deleteViaApi(testData.collegeLocalPatronGroup.id);

        cy.resetTenant();
        PatronGroups.deleteViaApi(testData.centralLocalPatronGroup.id);
        PatronGroupsConsortiumManager.deleteViaApi(testData.centralSharedPatronGroup);
        Users.deleteViaApi(testData.user753.userId);
        Users.deleteViaApi(testData.user754.userId);
      });

      it(
        'C407753 User with "Consortium manager: Can view existing settings" permission is able to view the list of patron groups of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C407753'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user753.username, testData.user753.password);
          // Without waiter, permissions aren't loading
          cy.wait(10000);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          ConsortiumManagerApp.waitLoading();
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          PatronGroupsConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedPatronGroup.payload.group,
            '',
            '',
            `${moment().format('l')} by`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralLocalPatronGroup.name,
            tenantNames.central,
            [
              testData.centralLocalPatronGroup.name,
              testData.centralLocalPatronGroup.description,
              '10',
              `${moment().format('l')} by`,
              tenantNames.central,
            ],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.collegeLocalPatronGroup.name,
            tenantNames.college,
            [
              testData.collegeLocalPatronGroup.name,
              testData.collegeLocalPatronGroup.description,
              '10',
              `${moment().format('l')} by`,
              tenantNames.college,
            ],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.universityLocalPatronGroup.name,
            tenantNames.university,
            [
              testData.universityLocalPatronGroup.name,
              testData.universityLocalPatronGroup.description,
              '10',
              `${moment().format('l')} by`,
              tenantNames.university,
            ],
            ['edit', 'trash'],
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3);
          SelectMembers.selectMembers(tenantNames.central);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(2);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedPatronGroup.payload.group,
            '',
            '',
            `${moment().format('l')} by`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.centralLocalPatronGroup.name,
            tenantNames.central,
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.collegeLocalPatronGroup.name,
            tenantNames.college,
            [
              testData.collegeLocalPatronGroup.name,
              testData.collegeLocalPatronGroup.description,
              '10',
              `${moment().format('l')} by`,
              tenantNames.college,
            ],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.universityLocalPatronGroup.name,
            tenantNames.university,
            [
              testData.universityLocalPatronGroup.name,
              testData.universityLocalPatronGroup.description,
              '10',
              `${moment().format('l')} by`,
              tenantNames.university,
            ],
            ['edit', 'trash'],
          );
        },
      );

      it(
        'C407754 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of patron groups of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C407754'] },
        () => {
          cy.setTenant(Affiliations.College);
          cy.login(testData.user754.username, testData.user754.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          // Without waiter, permissions aren't loading
          cy.wait(10000);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
          SelectMembers.selectMembers(tenantNames.university);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          PatronGroupsConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedPatronGroup.payload.group,
            '',
            '',
            `${moment().format('l')} by`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralLocalPatronGroup.name,
            tenantNames.central,
            [
              testData.centralLocalPatronGroup.name,
              '',
              '',
              `${moment().format('l')} by`,
              tenantNames.central,
            ],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.collegeLocalPatronGroup.name,
            tenantNames.college,
            [
              testData.collegeLocalPatronGroup.name,
              '',
              '',
              `${moment().format('l')} by`,
              tenantNames.college,
            ],
            ['edit', 'trash'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.universityLocalPatronGroup.name,
            tenantNames.university,
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 2);
          SelectMembers.selectMembers(tenantNames.college);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(1);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedPatronGroup.payload.group,
            '',
            '',
            `${moment().format('l')} by`,
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralLocalPatronGroup.name,
            tenantNames.central,
            [
              testData.centralLocalPatronGroup.name,
              '',
              '',
              `${moment().format('l')} by`,
              tenantNames.central,
            ],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.collegeLocalPatronGroup.name,
            tenantNames.college,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.universityLocalPatronGroup.name,
            tenantNames.university,
          );
        },
      );
    });
  });
});
