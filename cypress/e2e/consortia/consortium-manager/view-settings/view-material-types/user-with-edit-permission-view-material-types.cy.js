import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import MaterialTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/items/materialTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import MaterialTypes from '../../../../../support/fragments/settings/inventory/materialTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Material types', () => {
        const testData = {
          centralSharedMaterialType: {
            payload: {
              name: getTestEntityValue('C411416_centralSharedMaterialType'),
            },
          },
          centralLocalMaterialType: {
            name: getTestEntityValue('C411416_centralLocalMaterialType'),
            source: 'local',
          },
          collegeLocalMaterialType: {
            name: getTestEntityValue('C411416_collegeLocalMaterialType'),
            source: 'local',
          },
          universityLocalMaterialType: {
            name: getTestEntityValue('C411416_universityLocalMaterialType'),
            source: 'local',
          },
        };

        const constants = {
          source: {
            consortium: 'consortium',
            local: 'local',
          },
          memberLibraries: {
            all: 'All',
          },
        };

        before('Create test data', () => {
          cy.getAdminToken()
            .then(() => {
              MaterialTypesConsortiumManager.createViaApi(testData.centralSharedMaterialType).then(
                (newMaterialType) => {
                  testData.centralSharedMaterialType = newMaterialType;
                },
              );
            })
            .then(() => {
              cy.resetTenant();
              MaterialTypes.createMaterialTypeViaApi(testData.centralLocalMaterialType).then(
                ({ body }) => {
                  testData.centralLocalMaterialType.id = body.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              MaterialTypes.createMaterialTypeViaApi(testData.collegeLocalMaterialType).then(
                ({ body }) => {
                  testData.collegeLocalMaterialType.id = body.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              MaterialTypes.createMaterialTypeViaApi(testData.universityLocalMaterialType).then(
                ({ body }) => {
                  testData.universityLocalMaterialType.id = body.id;
                },
              );
            })
            .then(() => {
              // Create user in member-1 tenant (College) as per preconditions
              cy.setTenant(Affiliations.College);
              cy.createTempUser([Permissions.uiCreateEditDeleteMaterialTypes.gui]).then(
                (userProperties) => {
                  testData.user = userProperties;

                  // Assign affiliations to member-2 (University) tenant
                  cy.resetTenant();
                  cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);

                  // Assign permissions in central tenant
                  cy.assignPermissionsToExistingUser(testData.user.userId, [
                    Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                    Permissions.uiCreateEditDeleteMaterialTypes.gui,
                  ]);

                  // Assign permissions in member-2 (University) tenant
                  cy.setTenant(Affiliations.University);
                  cy.assignPermissionsToExistingUser(testData.user.userId, [
                    Permissions.uiCreateEditDeleteMaterialTypes.gui,
                  ]);
                },
              );
            })
            .then(() => {
              // Login to member-1 tenant and switch to central
              cy.resetTenant();
              cy.waitForAuthRefresh(() => {
                cy.login(testData.user.username, testData.user.password);
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                cy.reload();
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              }, 20_000);
              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              // Without waiter, permissions aren't loading
              cy.wait(10000);
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MaterialTypesConsortiumManager.deleteViaApi(testData.centralSharedMaterialType);
          MaterialTypes.deleteViaApi(testData.centralLocalMaterialType.id);
          cy.setTenant(Affiliations.College);
          MaterialTypes.deleteViaApi(testData.collegeLocalMaterialType.id);
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.University);
          MaterialTypes.deleteViaApi(testData.universityLocalMaterialType.id);
        });

        it(
          'C411416 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of material types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411416'] },
          () => {
            // Step 1: User opens "Consortium manager" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            // User expands "Members selection" accordion
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Click "Select members" button to verify modal behavior
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 3: Uncheck member-2 (University) tenant
            SelectMembers.checkMember(tenantNames.university, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 4: Save selection
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 5: User clicks on "Inventory" settings and "Material types"
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            MaterialTypesConsortiumManager.choose();
            // New button should be displayed since user has create/edit/remove permissions
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(true);

            // Step 6: User sees central tenant shared material type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedMaterialType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedMaterialType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 7: User sees central tenant local material type with action icons
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalMaterialType.name,
              tenantNames.central,
              [
                testData.centralLocalMaterialType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              ['edit', 'trash'],
            );

            // Step 8: Verify College local material type appears with action icons
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalMaterialType.name,
              tenantNames.college,
              [
                testData.collegeLocalMaterialType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              ['edit', 'trash'],
            );

            // Step 9: Verify University local material type does NOT appear (unselected)
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalMaterialType.name,
            );

            // Step 10: Click "Select members" button again
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2);

            // Step 11: Uncheck member-1 (College) tenant
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 1, false);

            // Step 12: Save selection
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 13: User sees central tenant shared material type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedMaterialType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedMaterialType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 14: User sees central tenant local material type with action icons
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalMaterialType.name,
              tenantNames.central,
              [
                testData.centralLocalMaterialType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              ['edit', 'trash'],
            );

            // Step 15: Verify College local material type does NOT appear (unselected)
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalMaterialType.name,
            );

            // Step 16: Verify University local material type does NOT appear (unselected)
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalMaterialType.name,
            );
          },
        );
      });
    });
  });
});
