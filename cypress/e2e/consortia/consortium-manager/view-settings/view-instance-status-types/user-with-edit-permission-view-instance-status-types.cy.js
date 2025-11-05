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
import InstanceStatusTypeConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/instanceStatusTypeConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import InstanceStatusTypes from '../../../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Instance status types', () => {
        const testData = {
          centralSharedInstanceStatusType: {
            payload: {
              name: getTestEntityValue('C411535_centralSharedInstanceStatusType'),
              code: getTestEntityValue('C411535_sharedCode'),
            },
          },
          centralLocalInstanceStatusType: {
            name: getTestEntityValue('C411535_centralLocalInstanceStatusType'),
            code: getTestEntityValue('C411535_centralCode'),
            source: 'local',
          },
          collegeLocalInstanceStatusType: {
            name: getTestEntityValue('C411535_collegeLocalInstanceStatusType'),
            code: getTestEntityValue('C411535_collegeCode'),
            source: 'local',
          },
          universityLocalInstanceStatusType: {
            name: getTestEntityValue('C411535_universityLocalInstanceStatusType'),
            code: getTestEntityValue('C411535_universityCode'),
            source: 'local',
          },
        };

        const consortiumSource = 'consortium';
        let tempUserC411535;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          InstanceStatusTypeConsortiumManager.createViaApi(
            testData.centralSharedInstanceStatusType,
          ).then((newInstanceStatusType) => {
            testData.centralSharedInstanceStatusType.id = newInstanceStatusType.id;
          });
          InstanceStatusTypes.createViaApi(testData.centralLocalInstanceStatusType).then(
            (instanceStatusTypeId) => {
              testData.centralLocalInstanceStatusType.id = instanceStatusTypeId.body.id;
            },
          );

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
          ]).then((userProperties) => {
            tempUserC411535 = userProperties;

            // Assign affiliations to both member tenants
            cy.assignAffiliationToUser(Affiliations.College, tempUserC411535.userId);
            cy.assignAffiliationToUser(Affiliations.University, tempUserC411535.userId);

            // Set up College (member-1) tenant
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC411535.userId, [
              Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
            ]);
            InstanceStatusTypes.createViaApi(testData.collegeLocalInstanceStatusType).then(
              (instanceStatusTypeId) => {
                testData.collegeLocalInstanceStatusType.id = instanceStatusTypeId.body.id;
              },
            );

            // Set up University (member-2) tenant
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(tempUserC411535.userId, [
              Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
            ]);
            InstanceStatusTypes.createViaApi(testData.universityLocalInstanceStatusType).then(
              (instanceStatusTypeId) => {
                testData.universityLocalInstanceStatusType.id = instanceStatusTypeId.body.id;
              },
            );
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.withinTenant(Affiliations.University, () => {
            InstanceStatusTypes.deleteViaApi(testData.universityLocalInstanceStatusType.id);
          });
          cy.withinTenant(Affiliations.College, () => {
            InstanceStatusTypes.deleteViaApi(testData.collegeLocalInstanceStatusType.id);
          });

          cy.resetTenant();
          InstanceStatusTypes.deleteViaApi(testData.centralLocalInstanceStatusType.id);
          InstanceStatusTypeConsortiumManager.deleteViaApi(
            testData.centralSharedInstanceStatusType,
          );
          Users.deleteViaApi(tempUserC411535.userId);
        });

        it(
          'C411535 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of instance status types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411535'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411535.username, tempUserC411535.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
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

            // Step 5: Navigate to Instance status types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            InstanceStatusTypeConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(true);

            // Step 6: Verify shared instance status type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedInstanceStatusType.payload.name,
              consortiumSource,
              [
                testData.centralSharedInstanceStatusType.payload.name,
                testData.centralSharedInstanceStatusType.payload.code,
                consortiumSource,
                `${moment().format('l')} by`,
                'All',
              ],
            );

            // Step 7: Verify central local instance status type with edit/delete actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalInstanceStatusType.name,
              tenantNames.central,
              [
                testData.centralLocalInstanceStatusType.name,
                testData.centralLocalInstanceStatusType.code,
                testData.centralLocalInstanceStatusType.source,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 8: Verify college (member-1) local instance status type with edit/delete actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalInstanceStatusType.name,
              tenantNames.college,
              [
                testData.collegeLocalInstanceStatusType.name,
                testData.collegeLocalInstanceStatusType.code,
                testData.collegeLocalInstanceStatusType.source,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 9: Verify university (member-2) local instance status type is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalInstanceStatusType.name,
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

            // Step 13: Verify shared instance status type still shown
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedInstanceStatusType.payload.name,
              consortiumSource,
              [
                testData.centralSharedInstanceStatusType.payload.name,
                testData.centralSharedInstanceStatusType.payload.code,
                consortiumSource,
                `${moment().format('l')} by`,
                'All',
              ],
            );

            // Step 14: Verify central local instance status type still shown with edit/delete actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalInstanceStatusType.name,
              tenantNames.central,
              [
                testData.centralLocalInstanceStatusType.name,
                testData.centralLocalInstanceStatusType.code,
                testData.centralLocalInstanceStatusType.source,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 15: Verify college (member-1) local instance status type is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalInstanceStatusType.name,
            );

            // Step 16: Verify university (member-2) local instance status type is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalInstanceStatusType.name,
            );
          },
        );
      });
    });
  });
});
