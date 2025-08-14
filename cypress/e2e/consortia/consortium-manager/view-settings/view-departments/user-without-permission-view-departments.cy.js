import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
  // messages,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import DepartmentsConsortiumManager from '../../../../../support/fragments/consortium-manager/users/departmentsConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import Departments from '../../../../../support/fragments/settings/users/departments';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Departments', () => {
        const testData = {
          centralSharedDepartment: {
            payload: {
              name: getTestEntityValue('C404401_centralSharedDepartment'),
              code: getTestEntityValue('C404401_centralSharedDepartment_code'),
            },
          },
          centralLocalDepartment: {
            name: getTestEntityValue('C404401_centralLocalDepartment'),
            code: getTestEntityValue('C404401_centralLocalDepartment_code'),
          },
          collegeLocalDepartment: {
            name: getTestEntityValue('C404401_collegeLocalDepartment'),
            code: getTestEntityValue('C404401_collegeLocalDepartment_code'),
          },
          universityLocalDepartment: {
            name: getTestEntityValue('C404401_universityLocalDepartment'),
            code: getTestEntityValue('C404401_universityLocalDepartment_code'),
          },
        };

        let tempUserC404401;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          DepartmentsConsortiumManager.createViaApi(testData.centralSharedDepartment).then(
            (newDepartment) => {
              testData.centralSharedDepartment.id = newDepartment.id;
            },
          );
          Departments.createViaApi(testData.centralLocalDepartment).then((departmentId) => {
            testData.centralLocalDepartment.id = departmentId;
          });

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.departmentsAll.gui,
          ]).then((userProperties) => {
            tempUserC404401 = userProperties;

            // Assign affiliation to College (member-1) only (NOT University member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC404401.userId);

            // Set up College (member-1) tenant with Orders permission (NOT departments permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC404401.userId, [
              Permissions.uiOrdersView.gui,
            ]);
            Departments.createViaApi(testData.collegeLocalDepartment).then((departmentId) => {
              testData.collegeLocalDepartment.id = departmentId;
            });

            // Set up University (member-2) tenant - user has no affiliation here but create test data
            cy.setTenant(Affiliations.University);
            Departments.createViaApi(testData.universityLocalDepartment).then((departmentId) => {
              testData.universityLocalDepartment.id = departmentId;
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Departments.deleteViaApi(testData.centralLocalDepartment.id);
          DepartmentsConsortiumManager.deleteViaApi(testData.centralSharedDepartment);
          Users.deleteViaApi(tempUserC404401.userId);

          cy.withinTenant(Affiliations.University, () => {
            Departments.deleteViaApi(testData.universityLocalDepartment.id);
          });
          cy.withinTenant(Affiliations.College, () => {
            Departments.deleteViaApi(testData.collegeLocalDepartment.id);
          });
        });

        it(
          'C404401 User without "departments.collection.get" permission is NOT able to view the list of departments of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C404401'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC404401.username, tempUserC404401.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Users settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);

            // Step 3: Navigate to Departments and verify toast message
            DepartmentsConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(
            //   messages.noPermission(tenantNames.college),
            // );

            // Step 4: Verify shared department is shown
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
              testData.centralSharedDepartment.payload.name,
              testData.centralSharedDepartment.payload.code,
              '',
              '',
              'All',
            ]);

            // Step 5: Verify central local department is shown with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.centralLocalDepartment.name,
                testData.centralLocalDepartment.code,
                '',
                '',
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 6: Verify college (member-1) local department is NOT shown
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalDepartment.name,
            // );

            // Step 7: Verify university (member-2) local department is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalDepartment.name,
            );

            // Step 8: Click Select members button
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 9: Uncheck all tenants
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);

            // Step 10: Save with no members selected
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(0);

            // Verify "The list contains no items" message and disabled New button
            ConsortiumManagerApp.verifyListIsEmpty();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);
          },
        );
      });
    });
  });
});
