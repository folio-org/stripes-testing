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
import ResourceIdentifierTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/resourceIdentifierTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ResourceIdentifierTypes from '../../../../../support/fragments/settings/inventory/instances/resourceIdentifierTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Resource identifier types', () => {
        const testData = {
          centralSharedResourceIdentifierType: {
            payload: {
              name: getTestEntityValue('C411310_centralSharedResourceIdentifierType'),
            },
          },
          centralLocalResourceIdentifierType: {
            name: getTestEntityValue('C411310_centralLocalResourceIdentifierType'),
            source: 'local',
          },
          collegeLocalResourceIdentifierType: {
            name: getTestEntityValue('C411310_collegeLocalResourceIdentifierType'),
            source: 'local',
          },
          universityLocalResourceIdentifierType: {
            name: getTestEntityValue('C411310_universityLocalResourceIdentifierType'),
            source: 'local',
          },
        };

        let tempUserC411310;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          ResourceIdentifierTypesConsortiumManager.createViaApi(
            testData.centralSharedResourceIdentifierType,
          ).then((newResourceIdentifierType) => {
            testData.centralSharedResourceIdentifierType.id = newResourceIdentifierType.id;
          });
          ResourceIdentifierTypes.createViaApi(testData.centralLocalResourceIdentifierType).then(
            (resourceIdentifierTypeId) => {
              testData.centralLocalResourceIdentifierType.id = resourceIdentifierTypeId.body.id;
            },
          );

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.crudResourceIdentifierTypes.gui,
          ]).then((userProperties) => {
            tempUserC411310 = userProperties;

            // Assign affiliation to College (member-1) only (NOT University member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC411310.userId);

            // Set up College (member-1) tenant with Finance permission (NOT resource identifier types permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC411310.userId, [
              Permissions.uiFinanceViewFiscalYear.gui,
            ]);
            ResourceIdentifierTypes.createViaApi(testData.collegeLocalResourceIdentifierType).then(
              (resourceIdentifierTypeId) => {
                testData.collegeLocalResourceIdentifierType.id = resourceIdentifierTypeId.body.id;
              },
            );

            // Set up University (member-2) tenant - user has no affiliation here but create test data
            cy.setTenant(Affiliations.University);
            ResourceIdentifierTypes.createViaApi(
              testData.universityLocalResourceIdentifierType,
            ).then((resourceIdentifierTypeId) => {
              testData.universityLocalResourceIdentifierType.id = resourceIdentifierTypeId.body.id;
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          ResourceIdentifierTypes.deleteViaApi(testData.centralLocalResourceIdentifierType.id);
          ResourceIdentifierTypesConsortiumManager.deleteViaApi(
            testData.centralSharedResourceIdentifierType,
          );
          Users.deleteViaApi(tempUserC411310.userId);

          cy.withinTenant(Affiliations.University, () => {
            ResourceIdentifierTypes.deleteViaApi(testData.universityLocalResourceIdentifierType.id);
          });
          cy.withinTenant(Affiliations.College, () => {
            ResourceIdentifierTypes.deleteViaApi(testData.collegeLocalResourceIdentifierType.id);
          });
        });

        it(
          'C411310 User without "inventory-storage.identifier-types.collection.get" permission is NOT able to view the list of resource identifier types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411310'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411310.username, tempUserC411310.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Resource identifier types and verify toast message
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ResourceIdentifierTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(
            //   messages.noPermission(tenantNames.college),
            // );

            // Step 3: Verify shared resource identifier type is shown
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
              testData.centralSharedResourceIdentifierType.payload.name,
              'consortium',
              '',
              'All',
            ]);

            // Step 4: Verify central local resource identifier type is shown with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [testData.centralLocalResourceIdentifierType.name, 'local', '', tenantNames.central],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 5: Verify college (member-1) local resource identifier type is NOT shown
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalResourceIdentifierType.name,
            // );

            // Step 6: Verify university (member-2) local resource identifier type is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalResourceIdentifierType.name,
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
