import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import CallNumberTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings-items/callNumberTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import { CallNumberTypes } from '../../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Call number types', () => {
        const testData = {
          centralSharedCallNumberType: {
            payload: {
              name: getTestEntityValue('C411392_centralSharedCallNumberType'),
            },
          },
          centralLocalCallNumberType: {
            name: getTestEntityValue('C411392_centralLocalCallNumberType'),
            source: 'local',
          },
          collegeLocalCallNumberType: {
            name: getTestEntityValue('C411392_collegeLocalCallNumberType'),
            source: 'local',
          },
          universityLocalCallNumberType: {
            name: getTestEntityValue('C411392_universityLocalCallNumberType'),
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
              CallNumberTypesConsortiumManager.createViaApiShared(
                testData.centralSharedCallNumberType,
              ).then((newCallNumberType) => {
                testData.centralSharedCallNumberType = newCallNumberType;
              });
            })
            .then(() => {
              cy.resetTenant();
              CallNumberTypes.createCallNumberTypeViaApi(testData.centralLocalCallNumberType).then(
                (id) => {
                  testData.centralLocalCallNumberType.id = id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              CallNumberTypes.createCallNumberTypeViaApi(testData.collegeLocalCallNumberType).then(
                (id) => {
                  testData.collegeLocalCallNumberType.id = id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              CallNumberTypes.createCallNumberTypeViaApi(
                testData.universityLocalCallNumberType,
              ).then((id) => {
                testData.universityLocalCallNumberType.id = id;
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerView.gui,
                Permissions.uiSettingsCallNumberTypesCreateEditDelete.gui,
              ]).then((userProperties) => {
                testData.user = userProperties;

                cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
                cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.uiSettingsCallNumberTypesCreateEditDelete.gui,
                ]);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.uiSettingsCallNumberTypesCreateEditDelete.gui,
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
          CallNumberTypesConsortiumManager.deleteViaApi(testData.centralSharedCallNumberType);
          CallNumberTypes.deleteLocalCallNumberTypeViaApi(testData.centralLocalCallNumberType.id);
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.College);
          CallNumberTypes.deleteLocalCallNumberTypeViaApi(testData.collegeLocalCallNumberType.id);
          cy.setTenant(Affiliations.University);
          CallNumberTypes.deleteLocalCallNumberTypeViaApi(
            testData.universityLocalCallNumberType.id,
          );
        });

        it(
          'C411392 User with "Consortium manager: Can view existing settings" permission is able to view the list of call number types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411392'] },
          () => {
            // Step 1: User opens "Consortium manager" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            // User expands "Members selection" accordion
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: User clicks on "Holdings, Items" settings and "Call number types"
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            CallNumberTypesConsortiumManager.choose();
            // New button should NOT be displayed since user has view permission only
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 3: User sees central tenant shared call number type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedCallNumberType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedCallNumberType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 4: User sees central tenant local call number type (no action icons for view-only user)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalCallNumberType.name,
              tenantNames.central,
              [
                testData.centralLocalCallNumberType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );

            // Step 5: Verify College local call number type appears (no action icons for view-only user)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalCallNumberType.name,
              tenantNames.college,
              [
                testData.collegeLocalCallNumberType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            // Step 6: Verify University local call number type appears (no action icons for view-only user)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalCallNumberType.name,
              tenantNames.university,
              [
                testData.universityLocalCallNumberType.name,
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

            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedCallNumberType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedCallNumberType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.centralLocalCallNumberType.name,
            );

            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalCallNumberType.name,
              tenantNames.college,
              [
                testData.collegeLocalCallNumberType.name,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalCallNumberType.name,
              tenantNames.university,
              [
                testData.universityLocalCallNumberType.name,
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
