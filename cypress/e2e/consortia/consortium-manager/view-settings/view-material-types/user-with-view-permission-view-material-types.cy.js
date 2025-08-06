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
              name: getTestEntityValue('C411415_centralSharedMaterialType'),
            },
          },
          centralLocalMaterialType: {
            name: getTestEntityValue('C411415_centralLocalMaterialType'),
            source: 'local',
          },
          collegeLocalMaterialType: {
            name: getTestEntityValue('C411415_collegeLocalMaterialType'),
            source: 'local',
          },
          universityLocalMaterialType: {
            name: getTestEntityValue('C411415_universityLocalMaterialType'),
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
              cy.resetTenant();
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerView.gui,
                Permissions.uiCreateEditDeleteMaterialTypes.gui,
              ]).then((userProperties) => {
                testData.user = userProperties;

                cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
                cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.uiCreateEditDeleteMaterialTypes.gui,
                ]);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.uiCreateEditDeleteMaterialTypes.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(testData.user.username, testData.user.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              // Without waiter, permissions aren't loading
              cy.wait(10000);
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MaterialTypesConsortiumManager.deleteViaApi(testData.centralSharedMaterialType);
          MaterialTypes.deleteViaApi(testData.centralLocalMaterialType.id);
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.College);
          MaterialTypes.deleteViaApi(testData.collegeLocalMaterialType.id);
          cy.setTenant(Affiliations.University);
          MaterialTypes.deleteViaApi(testData.universityLocalMaterialType.id);
        });

        it(
          'C411415 User with "Consortium manager: Can view existing settings" permission is able to view the list of material types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411415'] },
          () => {
            // Step 1: User opens "Consortium manager" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            // User expands "Members selection" accordion
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: User clicks on "Inventory" settings and "Material types"
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            MaterialTypesConsortiumManager.choose();
            // New button should NOT be displayed since Trillium (view permission only)
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 3: User sees central tenant shared material type
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

            // Step 4: User sees central tenant local material type (no action icons since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalMaterialType.name,
              tenantNames.central,
              [
                testData.centralLocalMaterialType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );

            // Step 5: Verify College local material type appears (no action icons since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalMaterialType.name,
              tenantNames.college,
              [
                testData.collegeLocalMaterialType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            // Step 6: Verify University local material type appears (no action icons since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalMaterialType.name,
              tenantNames.university,
              [
                testData.universityLocalMaterialType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
            );

            // Step 7: Click "Select members" button
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 8: Uncheck central tenant
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 9: Save selection
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 10: User sees central tenant shared material type
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

            // Step 11: Verify central tenant local material type does not appear
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.centralLocalMaterialType.name,
            );

            // Step 12: Verify College local material type appears (no action icons since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalMaterialType.name,
              tenantNames.college,
              [
                testData.collegeLocalMaterialType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            // Step 13: Verify University local material type appears (no action icons since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalMaterialType.name,
              tenantNames.university,
              [
                testData.universityLocalMaterialType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
            );
          },
        );
      });
    });
  });
});
