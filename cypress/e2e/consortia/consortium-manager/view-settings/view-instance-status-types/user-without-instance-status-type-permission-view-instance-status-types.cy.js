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
import InstanceStatusTypeConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/instanceStatusTypeConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import InstanceStatusTypes from '../../../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Instance status types', () => {
        const testData = {
          centralSharedInstanceStatusType: {
            payload: {
              name: getTestEntityValue('C411536_centralSharedInstanceStatusType'),
              code: getTestEntityValue('C411536_sharedCode'),
            },
          },
          centralLocalInstanceStatusType: {
            name: getTestEntityValue('C411536_centralLocalInstanceStatusType'),
            code: getTestEntityValue('C411536_centralCode'),
            source: 'local',
          },
          collegeLocalInstanceStatusType: {
            name: getTestEntityValue('C411536_collegeLocalInstanceStatusType'),
            code: getTestEntityValue('C411536_collegeCode'),
            source: 'local',
          },
          universityLocalInstanceStatusType: {
            name: getTestEntityValue('C411536_universityLocalInstanceStatusType'),
            code: getTestEntityValue('C411536_universityCode'),
            source: 'local',
          },
        };

        const consortiumSource = 'consortium';
        let tempUserC411536;

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
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiSettingsInstanceStatusesCreateEditDelete.gui,
          ]).then((userProperties) => {
            tempUserC411536 = userProperties;

            // Assign affiliation to College (member-1) but NOT University (member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC411536.userId);

            // Set up College (member-1) tenant with Finance permissions (no instance status types permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC411536.userId, [
              Permissions.uiFinanceViewFiscalYear.gui,
            ]);
            InstanceStatusTypes.createViaApi(testData.collegeLocalInstanceStatusType).then(
              (instanceStatusTypeId) => {
                testData.collegeLocalInstanceStatusType.id = instanceStatusTypeId.body.id;
              },
            );

            // Set up University (member-2) tenant - user has no affiliation here
            cy.setTenant(Affiliations.University);
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
          Users.deleteViaApi(tempUserC411536.userId);
        });

        it(
          'C411536 User without "inventory-storage.instance-statuses.collection.get" permission is NOT able to view the list of instance status types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411536'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411536.username, tempUserC411536.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            // Only 2 members should be available (Central and College) since user has no affiliation to University
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Instance status types and expect permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            InstanceStatusTypeConsortiumManager.choose();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Verify shared instance status type is visible
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

            // Step 4: Verify central local instance status type is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalInstanceStatusType.name,
              tenantNames.central,
              [
                testData.centralLocalInstanceStatusType.name,
                testData.centralLocalInstanceStatusType.code,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 5: Verify college (member-1) local instance status type is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalInstanceStatusType.name,
            // );

            // Step 6: Verify university (member-2) local instance status type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalInstanceStatusType.name,
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
