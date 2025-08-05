import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
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
              name: getTestEntityValue('C411516_centralSharedContributorType'),
              code: getTestEntityValue('C411516_sharedCode'),
            },
          },
          centralLocalContributorType: {
            name: getTestEntityValue('C411516_centralLocalContributorType'),
            code: getTestEntityValue('C411516_centralCode'),
            source: 'local',
          },
          collegeLocalContributorType: {
            name: getTestEntityValue('C411516_collegeLocalContributorType'),
            code: getTestEntityValue('C411516_collegeCode'),
            source: 'local',
          },
          universityLocalContributorType: {
            name: getTestEntityValue('C411516_universityLocalContributorType'),
            code: getTestEntityValue('C411516_universityCode'),
            source: 'local',
          },
        };

        const consortiumSource = 'consortium';
        let tempUserC411516;

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
            tempUserC411516 = userProperties;
            ContributorTypes.createViaApi(testData.collegeLocalContributorType).then(
              (contributorTypeId) => {
                testData.collegeLocalContributorType.id = contributorTypeId.body.id;
              },
            );

            cy.resetTenant();
            // Assign affiliations: user created in College (member-1), affiliated with Central and University (member-2)
            cy.assignAffiliationToUser(Affiliations.University, tempUserC411516.userId);
            cy.assignPermissionsToExistingUser(tempUserC411516.userId, [
              Permissions.consortiaSettingsConsortiumManagerShare.gui,
              Permissions.crudContributorTypes.gui,
            ]);

            // Set up permissions in University (member-2) tenant
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(tempUserC411516.userId, [
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
          Users.deleteViaApi(tempUserC411516.userId);
        });

        it(
          'C411516 User with "Consortium manager: Can share settings to all members" permission is able to view the list of contributor types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411516'] },
          () => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(tempUserC411516.username, tempUserC411516.password);
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

            // Step 2: Navigate to Contributor types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ContributorTypesConsortiumManager.choose();
            // Note: New button is NOT displayed since Trillium
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 3: Verify shared contributor type (without Edit/Delete actions since Trillium)
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

            // Step 4: Verify central local contributor type (without Edit/Delete actions since Trillium)
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
            );

            // Step 5: Verify college (member-1) local contributor type (without Edit/Delete actions since Trillium)
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
            );

            // Step 6: Verify university (member-2) local contributor type (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalContributorType.name,
              tenantNames.university,
              [
                testData.universityLocalContributorType.name,
                testData.universityLocalContributorType.code,
                'local',
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
            );

            // Step 7: Click Select members button
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 8: Uncheck member-1 (college) and member-2 (university) tenants
            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.selectMembers(tenantNames.university);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 1, false);

            // Step 9: Save with only central tenant selected
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 10: Verify shared contributor type still visible (without Edit/Delete actions since Trillium)
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

            // Step 11: Verify central local contributor type still visible (without Edit/Delete actions since Trillium)
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
            );

            // Step 12: Verify college (member-1) local contributor type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalContributorType.name,
            );

            // Step 13: Verify university (member-2) local contributor type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalContributorType.name,
            );
          },
        );
      });
    });
  });
});
