import moment from 'moment';
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
import MaterialTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/items/materialTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import MaterialTypes from '../../../../../support/fragments/settings/inventory/materialTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Material types', () => {
        const testData = {
          centralSharedMaterialType: {
            payload: {
              name: getTestEntityValue('C411417_centralSharedMaterialType'),
            },
          },
          centralLocalMaterialType: {
            name: getTestEntityValue('C411417_centralLocalMaterialType'),
            source: 'local',
          },
          collegeLocalMaterialType: {
            name: getTestEntityValue('C411417_collegeLocalMaterialType'),
            source: 'local',
          },
          universityLocalMaterialType: {
            name: getTestEntityValue('C411417_universityLocalMaterialType'),
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

        let tempUserC411417;

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
              cy.resetTenant();
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerView.gui,
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.uiCreateEditDeleteMaterialTypes.gui,
              ]).then((userProperties) => {
                tempUserC411417 = userProperties;

                // Assign affiliation to member-1 (College) tenant only
                cy.assignAffiliationToUser(Affiliations.College, tempUserC411417.userId);

                // Set up permissions in College (member-1) tenant - only Finance: View fiscal year
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(tempUserC411417.userId, [
                  Permissions.uiFinanceViewFiscalYear.gui,
                ]);

                // Set up University (member-2) tenant - user has no affiliation here
                cy.setTenant(Affiliations.University);
                MaterialTypes.createMaterialTypeViaApi(testData.universityLocalMaterialType).then(
                  ({ body }) => {
                    testData.universityLocalMaterialType.id = body.id;
                  },
                );
              });
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          MaterialTypes.deleteViaApi(testData.centralLocalMaterialType.id);
          MaterialTypesConsortiumManager.deleteViaApi(testData.centralSharedMaterialType);
          Users.deleteViaApi(tempUserC411417.userId);

          cy.withinTenant(Affiliations.College, () => {
            MaterialTypes.deleteViaApi(testData.collegeLocalMaterialType.id);
          });
          cy.withinTenant(Affiliations.University, () => {
            MaterialTypes.deleteViaApi(testData.universityLocalMaterialType.id);
          });
        });

        it(
          'C411417 User without "inventory-storage.material-types.collection.get" permission is NOT able to view the list of material types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411417'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411417.username, tempUserC411417.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            // Only 2 members should be available (Central and College) since user has no affiliation to University
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Material types and expect permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            MaterialTypesConsortiumManager.choose();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Verify shared material type is visible
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

            // Step 4: Verify central local material type is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalMaterialType.name,
              tenantNames.central,
              [
                testData.centralLocalMaterialType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 5: Verify college (member-1) local material type is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalMaterialType.name,
            // );

            // Step 6: Verify university (member-2) local material type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalMaterialType.name,
            );

            // Step 7: Click Select members to verify modal state
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 8: Uncheck all members
            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);

            // Step 9: Save with 0 members selected
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
