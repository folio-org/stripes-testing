import moment from 'moment';
import Permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import { calloutTypes } from '../../../../../../interactors';
import DepartmentsConsortiumManager from '../../../../../support/fragments/consortium-manager/users/departmentsConsortiumManager';
import Departments from '../../../../../support/fragments/settings/users/departments';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Departments', () => {
        let userAData;
        let userBData;
        const sharedDepartment4 = {
          name: '',
          code: getTestEntityValue('SD4'),
        };
        const sharedDepartment5 = {
          name: getTestEntityValue('Shared_department_5'),
          code: '',
        };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.departmentsAll.gui,
              ]).then((userProperties) => {
                userAData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userAData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userAData.userId, [
                  Permissions.uiOrganizationsView.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.getAdminToken();
              cy.createTempUser([Permissions.departmentsAll.gui]).then((userProperties) => {
                userBData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userBData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userBData.userId, [
                  Permissions.departmentsAll.gui,
                ]);
                cy.resetTenant();
                cy.getAdminToken();
                cy.assignAffiliationToUser(Affiliations.University, userBData.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userBData.userId, [
                  Permissions.departmentsAll.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(userAData.username, userAData.password);
            });
        });

        after('Delete users data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userAData.userId);
          Users.deleteViaApi(userBData.userId);
          Departments.getViaApi({
            limit: 1,
            query: `name=="${sharedDepartment4.name}"`,
          }).then((department) => {
            DepartmentsConsortiumManager.deleteViaApi({
              payload: {
                name: sharedDepartment4.name,
                code: sharedDepartment4.code,
                id: department[0].id,
                source: 'consortium',
              },
              settingId: department[0].id,
              url: '/departments',
            });
          });
        });

        it(
          'C407740 Department can be shared to all tenants in "Consortium manager" app regardless permission and affiliation (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet'] },
          () => {
            TopMenuNavigation.navigateToApp('Consortium manager');
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
            DepartmentsConsortiumManager.choose();
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );

            ConsortiaControlledVocabularyPaneset.createViaUi(true, sharedDepartment4);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.pleaseFillIn,
            });

            sharedDepartment4.name = getTestEntityValue('Shared_department_4');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: sharedDepartment4.name });
            ConsortiaControlledVocabularyPaneset.clickSave();
            const createdDepartment = [
              ...Object.values(sharedDepartment4),
              moment().format('l'),
              '-',
              'All',
            ];

            ConfirmShare.waitLoadingConfirmShareToAll(sharedDepartment4.name);
            ConfirmShare.clickConfirm();
            ConsortiumManagerApp.checkMessage(messages.created(sharedDepartment4.name, 'All'));
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdDepartment, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, sharedDepartment5);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              code: messages.codeRequired,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            cy.logout();
            cy.login(userBData.username, userBData.password, {
              path: SettingsMenu.departments,
              waiter: Departments.waitLoading,
            });
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              createdDepartment.slice(0, -1),
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.departments);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              createdDepartment.slice(0, -1),
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.departments);
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
