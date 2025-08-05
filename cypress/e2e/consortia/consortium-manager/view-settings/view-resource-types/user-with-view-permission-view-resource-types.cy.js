import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ResourceTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/resourceTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ResourceTypes from '../../../../../support/fragments/settings/inventory/instances/resourceTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Resource types', () => {
        const testData = {
          centralSharedResourceType: {
            payload: {
              name: getTestEntityValue('C411555_centralSharedResourceType'),
              code: getTestEntityValue('C411555_sharedCode'),
            },
          },
          centralLocalResourceType: {
            name: getTestEntityValue('C411555_centralLocalResourceType'),
            code: getTestEntityValue('C411555_centralCode'),
            source: 'local',
          },
          collegeLocalResourceType: {
            name: getTestEntityValue('C411555_collegeLocalResourceType'),
            code: getTestEntityValue('C411555_collegeCode'),
            source: 'local',
          },
          universityLocalResourceType: {
            name: getTestEntityValue('C411555_universityLocalResourceType'),
            code: getTestEntityValue('C411555_universityCode'),
            source: 'local',
          },
        };

        let tempUserC411555;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          ResourceTypesConsortiumManager.createViaApi(testData.centralSharedResourceType).then(
            (newResourceType) => {
              testData.centralSharedResourceType.id = newResourceType.id;
            },
          );
          ResourceTypes.createViaApi(testData.centralLocalResourceType).then((resourceTypeId) => {
            testData.centralLocalResourceType.id = resourceTypeId.body.id;
          });

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.crudDefinedResourceTypes.gui,
          ]).then((userProperties) => {
            tempUserC411555 = userProperties;

            // Assign affiliations to both member tenants
            cy.assignAffiliationToUser(Affiliations.College, tempUserC411555.userId);
            cy.assignAffiliationToUser(Affiliations.University, tempUserC411555.userId);

            // Set up College (member-1) tenant
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC411555.userId, [
              Permissions.crudDefinedResourceTypes.gui,
            ]);
            ResourceTypes.createViaApi(testData.collegeLocalResourceType).then((resourceTypeId) => {
              testData.collegeLocalResourceType.id = resourceTypeId.body.id;
            });

            // Set up University (member-2) tenant
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(tempUserC411555.userId, [
              Permissions.crudDefinedResourceTypes.gui,
            ]);
            ResourceTypes.createViaApi(testData.universityLocalResourceType).then(
              (resourceTypeId) => {
                testData.universityLocalResourceType.id = resourceTypeId.body.id;
              },
            );
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.withinTenant(Affiliations.University, () => {
            ResourceTypes.deleteViaApi(testData.universityLocalResourceType.id);
          });
          cy.withinTenant(Affiliations.College, () => {
            ResourceTypes.deleteViaApi(testData.collegeLocalResourceType.id);
          });

          cy.resetTenant();
          ResourceTypes.deleteViaApi(testData.centralLocalResourceType.id);
          ResourceTypesConsortiumManager.deleteViaApi(testData.centralSharedResourceType);
          Users.deleteViaApi(tempUserC411555.userId);
        });

        it(
          'C411555 User with "Consortium manager: Can view existing settings" permission is able to view the list of resource types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411555'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411555.username, tempUserC411555.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Resource types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ResourceTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 3: Verify shared resource type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedResourceType.payload.name,
              'consortium',
              [
                testData.centralSharedResourceType.payload.name,
                testData.centralSharedResourceType.payload.code,
                'consortium',
                `${moment().format('l')} by`,
                'All',
              ],
            );

            // Step 4: Verify central local resource type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalResourceType.name,
              tenantNames.central,
              [
                testData.centralLocalResourceType.name,
                testData.centralLocalResourceType.code,
                '',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );

            // Step 5: Verify college (member-1) local resource type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalResourceType.name,
              tenantNames.college,
              [
                testData.collegeLocalResourceType.name,
                testData.collegeLocalResourceType.code,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            // Step 6: Verify university (member-2) local resource type
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalResourceType.name,
              tenantNames.university,
              [
                testData.universityLocalResourceType.name,
                testData.universityLocalResourceType.code,
                '',
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

            // Step 10: Verify shared resource type still shown
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedResourceType.payload.name,
              'consortium',
              [
                testData.centralSharedResourceType.payload.name,
                testData.centralSharedResourceType.payload.code,
                'consortium',
                `${moment().format('l')} by`,
                'All',
              ],
            );

            // Step 11: Verify central local resource type is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.centralLocalResourceType.name,
            );

            // Step 12: Verify college (member-1) local resource type still shown
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalResourceType.name,
              tenantNames.college,
              [
                testData.collegeLocalResourceType.name,
                testData.collegeLocalResourceType.code,
                '',
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            // Step 13: Verify university (member-2) local resource type still shown
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalResourceType.name,
              tenantNames.university,
              [
                testData.universityLocalResourceType.name,
                testData.universityLocalResourceType.code,
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
