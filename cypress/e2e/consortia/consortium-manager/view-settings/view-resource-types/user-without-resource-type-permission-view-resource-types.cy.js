import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
  // messages,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ResourceTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/resourceTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ResourceTypes from '../../../../../support/fragments/settings/inventory/instances/resourceTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Resource types', () => {
        const testData = {
          centralSharedResourceType: {
            payload: {
              name: getTestEntityValue('C411557_centralSharedResourceType'),
              code: getTestEntityValue('C411557_sharedCode'),
            },
          },
          centralLocalResourceType: {
            name: getTestEntityValue('C411557_centralLocalResourceType'),
            code: getTestEntityValue('C411557_centralCode'),
            source: 'local',
          },
          collegeLocalResourceType: {
            name: getTestEntityValue('C411557_collegeLocalResourceType'),
            code: getTestEntityValue('C411557_collegeCode'),
            source: 'local',
          },
          universityLocalResourceType: {
            name: getTestEntityValue('C411557_universityLocalResourceType'),
            code: getTestEntityValue('C411557_universityCode'),
            source: 'local',
          },
        };

        let tempUserC411557;

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
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.crudDefinedResourceTypes.gui,
          ]).then((userProperties) => {
            tempUserC411557 = userProperties;

            // Assign affiliation to College (member-1) only (NOT University member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC411557.userId);

            // Set up College (member-1) tenant with Finance permission (NOT resource types permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC411557.userId, [
              Permissions.uiFinanceViewFiscalYear.gui,
            ]);
            ResourceTypes.createViaApi(testData.collegeLocalResourceType).then((resourceTypeId) => {
              testData.collegeLocalResourceType.id = resourceTypeId.body.id;
            });

            // Set up University (member-2) tenant - user has no affiliation here but create test data
            cy.setTenant(Affiliations.University);
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
          Users.deleteViaApi(tempUserC411557.userId);
        });

        it(
          'C411557 User without "inventory-storage.resource-types.collection.get" permission is NOT able to view the list of resource types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411557'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411557.username, tempUserC411557.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Resource types and verify toast message
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ResourceTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(true);

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(
            //   messages.noPermission(tenantNames.college),
            // );

            // Step 3: Verify shared resource type is shown
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

            // Step 4: Verify central local resource type is shown
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

            // Step 5: Verify college (member-1) local resource type is NOT shown
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalResourceType.name,
            // );

            // Step 6: Verify university (member-2) local resource type is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalResourceType.name,
            );

            // Step 7: Click Select members button
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 8: Uncheck all tenants
            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);

            // Step 9: Save with no members selected
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
