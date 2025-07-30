import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import DepartmentsConsortiumManager from '../../../../../support/fragments/consortium-manager/users/departmentsConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Departments from '../../../../../support/fragments/settings/users/departments';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Departments', () => {
        let userData;
        const sharedDepartment3 = {
          name: getTestEntityValue('Shared_department_3'),
          code: getTestEntityValue('SD3'),
        };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.departmentsAll.gui,
              ]).then((userProperties) => {
                userData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.departmentsAll.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(userData.username, userData.password);
            });
        });

        after('Delete users data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          Departments.getViaApi({
            limit: 1,
            query: `name=="${sharedDepartment3.name}"`,
          }).then((department) => {
            DepartmentsConsortiumManager.deleteViaApi({
              payload: {
                name: sharedDepartment3.name,
                code: sharedDepartment3.code,
                id: department[0].id,
                source: 'consortium',
              },
              settingId: department[0].id,
              url: '/departments',
            });
          });
        });

        it(
          'C407001 User with "Consortium manager: Can share settings to all members" permission is able to add/edit department shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C407001'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(1);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, true);

            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
            DepartmentsConsortiumManager.chooseWithEmptyList();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, sharedDepartment3);
            ConsortiaControlledVocabularyPaneset.clickSave();
            let createdDepartment = [
              ...Object.values(sharedDepartment3),
              moment().format('l'),
              '-',
              'All',
            ];

            ConfirmShare.waitLoadingConfirmShareToAll(sharedDepartment3.name);
            ConfirmShare.clickConfirm();
            ConsortiumManagerApp.checkMessage(messages.created(sharedDepartment3.name, 'All'));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdDepartment, [
              'edit',
              'trash',
            ]);

            cy.visit(SettingsMenu.departments);
            cy.wait(4000);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              createdDepartment.slice(0, -1),
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.departments);
            cy.wait(4000);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              createdDepartment.slice(0, -1),
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
            DepartmentsConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.performAction(
              sharedDepartment3.name,
              actionIcons.edit,
            );

            sharedDepartment3.name = getTestEntityValue('Shared_department_3_edited');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: sharedDepartment3.name });
            sharedDepartment3.code = getTestEntityValue('SD3E');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ code: sharedDepartment3.code });
            ConsortiaControlledVocabularyPaneset.clickSave();
            createdDepartment = [
              ...Object.values(sharedDepartment3),
              moment().format('l'),
              '-',
              'All',
            ];

            ConfirmShare.waitLoadingConfirmShareToAll(sharedDepartment3.name);
            ConfirmShare.clickConfirm();
            ConsortiumManagerApp.checkMessage(messages.updated(sharedDepartment3.name, 'All'));

            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1);

            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(0);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, false);

            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyListIsEmpty();
            // ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();

            cy.visit(SettingsMenu.departments);
            cy.wait(4000);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              createdDepartment.slice(0, -1),
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.departments);
            cy.wait(4000);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              createdDepartment.slice(0, -1),
            );
          },
        );
      });
    });
  });
});
