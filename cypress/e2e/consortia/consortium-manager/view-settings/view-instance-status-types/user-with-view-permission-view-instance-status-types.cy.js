import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
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
              name: getTestEntityValue('C411534_centralSharedInstanceStatusType'),
              code: getTestEntityValue('C411534_sharedCode'),
            },
          },
          centralLocalInstanceStatusType: {
            name: getTestEntityValue('C411534_centralLocalInstanceStatusType'),
            code: getTestEntityValue('C411534_centralCode'),
            source: 'local',
          },
          collegeLocalInstanceStatusType: {
            name: getTestEntityValue('C411534_collegeLocalInstanceStatusType'),
            code: getTestEntityValue('C411534_collegeCode'),
            source: 'local',
          },
          universityLocalInstanceStatusType: {
            name: getTestEntityValue('C411534_universityLocalInstanceStatusType'),
            code: getTestEntityValue('C411534_universityCode'),
            source: 'local',
          },
        };

        const consortiumSource = 'consortium';
        let tempUserC411534;

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
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
          ]).then((userProperties) => {
            tempUserC411534 = userProperties;

            // Assign affiliations to both member tenants
            cy.assignAffiliationToUser(Affiliations.College, tempUserC411534.userId);
            cy.assignAffiliationToUser(Affiliations.University, tempUserC411534.userId);

            // Set up College (member-1) tenant
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC411534.userId, [
              Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
            ]);
            InstanceStatusTypes.createViaApi(testData.collegeLocalInstanceStatusType).then(
              (instanceStatusTypeId) => {
                testData.collegeLocalInstanceStatusType.id = instanceStatusTypeId.body.id;
              },
            );

            // Set up University (member-2) tenant
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(tempUserC411534.userId, [
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
          Users.deleteViaApi(tempUserC411534.userId);
        });

        it(
          'C411534 User with "Consortium manager: Can view existing settings" permission is able to view the list of instance status types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411534'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411534.username, tempUserC411534.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Instance status types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            InstanceStatusTypeConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 3: Verify shared instance status type
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

            // Step 4: Verify central local instance status type
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
            );

            // Step 5: Verify college (member-1) local instance status type
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
            );

            // Step 6: Verify university (member-2) local instance status type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalInstanceStatusType.name,
              tenantNames.university,
              [
                testData.universityLocalInstanceStatusType.name,
                testData.universityLocalInstanceStatusType.code,
                testData.universityLocalInstanceStatusType.source,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
            );

            // Step 7: Click Select members button
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 8: Uncheck central tenant
            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);

            // Step 9: Save with 2 members selected
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 10: Verify shared instance status type still shown
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

            // Step 11: Verify central local instance status type is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.centralLocalInstanceStatusType.name,
            );

            // Step 12: Verify college (member-1) local instance status type still shown
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
            );

            // Step 13: Verify university (member-2) local instance status type still shown
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalInstanceStatusType.name,
              tenantNames.university,
              [
                testData.universityLocalInstanceStatusType.name,
                testData.universityLocalInstanceStatusType.code,
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
