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
              name: getTestEntityValue('C411395_centralSharedCallNumberType'),
            },
          },
          centralLocalCallNumberType: {
            name: getTestEntityValue('C411395_centralLocalCallNumberType'),
            source: 'local',
          },
          collegeLocalCallNumberType: {
            name: getTestEntityValue('C411395_collegeLocalCallNumberType'),
            source: 'local',
          },
          universityLocalCallNumberType: {
            name: getTestEntityValue('C411395_universityLocalCallNumberType'),
            source: 'local',
          },
        };

        const constants = {
          source: {
            consortium: 'consortium',
          },
          memberLibraries: {
            all: 'All',
          },
        };
        let tempUserC411395;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          CallNumberTypesConsortiumManager.createViaApiShared(
            testData.centralSharedCallNumberType,
          ).then((newCallNumberType) => {
            testData.centralSharedCallNumberType.id = newCallNumberType.id;
          });
          CallNumberTypes.createCallNumberTypeViaApi(testData.centralLocalCallNumberType).then(
            (callNumberTypeId) => {
              testData.centralLocalCallNumberType.id = callNumberTypeId;
            },
          );

          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiSettingsCallNumberTypesCreateEditDelete.gui]).then(
            (userProperties) => {
              tempUserC411395 = userProperties;
              CallNumberTypes.createCallNumberTypeViaApi(testData.collegeLocalCallNumberType).then(
                (callNumberTypeId) => {
                  testData.collegeLocalCallNumberType.id = callNumberTypeId;
                },
              );

              cy.resetTenant();
              // Assign affiliations: user created in College (member-1), affiliated with Central and University (member-2)
              cy.assignAffiliationToUser(Affiliations.University, tempUserC411395.userId);
              cy.assignPermissionsToExistingUser(tempUserC411395.userId, [
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.uiSettingsCallNumberTypesCreateEditDelete.gui,
              ]);

              // Set up permissions in University (member-2) tenant
              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(tempUserC411395.userId, [
                Permissions.uiSettingsCallNumberTypesCreateEditDelete.gui,
              ]);
              CallNumberTypes.createCallNumberTypeViaApi(
                testData.universityLocalCallNumberType,
              ).then((callNumberTypeId) => {
                testData.universityLocalCallNumberType.id = callNumberTypeId;
              });
            },
          );
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          CallNumberTypes.deleteLocalCallNumberTypeViaApi(testData.centralLocalCallNumberType.id);
          CallNumberTypesConsortiumManager.deleteViaApi(testData.centralSharedCallNumberType);
          Users.deleteViaApi(tempUserC411395.userId);

          cy.withinTenant(Affiliations.University, () => {
            CallNumberTypes.deleteLocalCallNumberTypeViaApi(
              testData.universityLocalCallNumberType.id,
            );
          });
          cy.withinTenant(Affiliations.College, () => {
            CallNumberTypes.deleteLocalCallNumberTypeViaApi(testData.collegeLocalCallNumberType.id);
          });
        });

        it(
          'C411395 User with "Consortium manager: Can share settings to all members" permission is able to view the list of call number types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411395'] },
          () => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(tempUserC411395.username, tempUserC411395.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
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

            // Step 2: Navigate to Call number types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            CallNumberTypesConsortiumManager.choose();
            // Note: New button is NOT displayed since Trillium
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 3: Verify shared call number type (without Edit/Delete actions since Trillium)
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

            // Step 4: Verify central local call number type (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalCallNumberType.name,
              tenantNames.central,
              [
                testData.centralLocalCallNumberType.name,
                'local',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );

            // Step 5: Verify college (member-1) local call number type (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalCallNumberType.name,
              tenantNames.college,
              [
                testData.collegeLocalCallNumberType.name,
                'local',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            // Step 6: Verify university (member-2) local call number type (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalCallNumberType.name,
              tenantNames.university,
              [
                testData.universityLocalCallNumberType.name,
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

            // Step 10: Verify shared call number type still visible (without Edit/Delete actions since Trillium)
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

            // Step 11: Verify central local call number type still visible (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalCallNumberType.name,
              tenantNames.central,
              [
                testData.centralLocalCallNumberType.name,
                'local',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );

            // Step 12: Verify college (member-1) local call number type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalCallNumberType.name,
            );

            // Step 13: Verify university (member-2) local call number type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalCallNumberType.name,
            );
          },
        );
      });
    });
  });
});
