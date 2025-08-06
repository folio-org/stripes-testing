import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ContributorTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/contributorTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ContributorTypes from '../../../../../support/fragments/settings/inventory/instances/contributorTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Contributor types', () => {
        const testData = {
          centralSharedContributorType: {
            payload: {
              name: getTestEntityValue('C411514_centralSharedContributorType'),
              code: getTestEntityValue('C411514_sharedCode'),
            },
          },
          centralLocalContributorType: {
            name: getTestEntityValue('C411514_centralLocalContributorType'),
            code: getTestEntityValue('C411514_centralCode'),
            source: 'local',
          },
          collegeLocalContributorType: {
            name: getTestEntityValue('C411514_collegeLocalContributorType'),
            code: getTestEntityValue('C411514_collegeCode'),
            source: 'local',
          },
          universityLocalContributorType: {
            name: getTestEntityValue('C411514_universityLocalContributorType'),
            code: getTestEntityValue('C411514_universityCode'),
            source: 'local',
          },
        };

        const consortiumSource = 'consortium';
        let tempUserC411514;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          ContributorTypesConsortiumManager.createViaApi(
            testData.centralSharedContributorType,
          ).then((newContributorType) => {
            testData.centralSharedContributorType.id = newContributorType.id;
          });
          ContributorTypes.createViaApi(testData.centralLocalContributorType).then(
            (contributorTypeId) => {
              testData.centralLocalContributorType.id = contributorTypeId.body.id;
            },
          );

          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.crudContributorTypes.gui]).then((userProperties) => {
            tempUserC411514 = userProperties;
            ContributorTypes.createViaApi(testData.collegeLocalContributorType).then(
              (contributorTypeId) => {
                testData.collegeLocalContributorType.id = contributorTypeId.body.id;
              },
            );

            cy.resetTenant();
            // Assign affiliations: user created in College (member-1), affiliated with Central and University (member-2)
            cy.assignAffiliationToUser(Affiliations.University, tempUserC411514.userId);
            cy.assignPermissionsToExistingUser(tempUserC411514.userId, [
              Permissions.consortiaSettingsConsortiumManagerEdit.gui,
              Permissions.crudContributorTypes.gui,
            ]);

            // Set up permissions in University (member-2) tenant
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(tempUserC411514.userId, [
              Permissions.crudContributorTypes.gui,
            ]);
            ContributorTypes.createViaApi(testData.universityLocalContributorType).then(
              (contributorTypeId) => {
                testData.universityLocalContributorType.id = contributorTypeId.body.id;
              },
            );
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.withinTenant(Affiliations.University, () => {
            ContributorTypes.deleteViaApi(testData.universityLocalContributorType.id);
          });
          cy.withinTenant(Affiliations.College, () => {
            ContributorTypes.deleteViaApi(testData.collegeLocalContributorType.id);
          });

          cy.resetTenant();
          ContributorTypes.deleteViaApi(testData.centralLocalContributorType.id);
          ContributorTypesConsortiumManager.deleteViaApi(testData.centralSharedContributorType);
          Users.deleteViaApi(tempUserC411514.userId);
        });

        it(
          'C411514 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of contributor types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411514'] },
          () => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(tempUserC411514.username, tempUserC411514.password);
              cy.reload();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            }, 20_000);
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Click Select members button
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 3: Uncheck member-2 (university) tenant
            SelectMembers.selectMembers(tenantNames.university);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 4: Save with 2 members selected
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 5: Navigate to Contributor types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ContributorTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(true);

            // Step 6: Verify shared contributor type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedContributorType.payload.name,
              consortiumSource,
              [
                testData.centralSharedContributorType.payload.name,
                testData.centralSharedContributorType.payload.code,
                consortiumSource,
                `${moment().format('l')} by`,
                'All',
              ],
            );

            // Step 7: Verify central local contributor type with edit/delete actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalContributorType.name,
              tenantNames.central,
              [
                testData.centralLocalContributorType.name,
                testData.centralLocalContributorType.code,
                'local',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 8: Verify college (member-1) local contributor type with edit/delete actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalContributorType.name,
              tenantNames.college,
              [
                testData.collegeLocalContributorType.name,
                testData.collegeLocalContributorType.code,
                'local',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 9: Verify university (member-2) local contributor type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalContributorType.name,
            );

            // Step 10: Click Select members button again
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 11: Uncheck member-1 (college) tenant
            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 1, false);

            // Step 12: Save with only central tenant selected
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 13: Verify shared contributor type still visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedContributorType.payload.name,
              consortiumSource,
              [
                testData.centralSharedContributorType.payload.name,
                testData.centralSharedContributorType.payload.code,
                consortiumSource,
                `${moment().format('l')} by`,
                'All',
              ],
            );

            // Step 14: Verify central local contributor type still visible with edit/delete actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalContributorType.name,
              tenantNames.central,
              [
                testData.centralLocalContributorType.name,
                testData.centralLocalContributorType.code,
                'local',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 15: Verify college (member-1) local contributor type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalContributorType.name,
            );

            // Step 16: Verify university (member-2) local contributor type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalContributorType.name,
            );
          },
        );
      });
    });
  });
});
