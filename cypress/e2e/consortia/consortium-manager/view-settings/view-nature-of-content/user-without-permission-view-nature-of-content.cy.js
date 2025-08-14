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
import NatureOfContentConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/natureOfContentConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import NatureOfContent from '../../../../../support/fragments/settings/inventory/instances/natureOfContent';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Nature of content', () => {
        const testData = {
          centralSharedNatureOfContent: {
            payload: {
              name: getTestEntityValue('C410964_centralSharedNatureOfContent'),
            },
          },
          centralLocalNatureOfContent: {
            source: 'local',
            name: getTestEntityValue('C410964_centralLocalNatureOfContent'),
          },
          collegeLocalNatureOfContent: {
            source: 'local',
            name: getTestEntityValue('C410964_collegeLocalNatureOfContent'),
          },
          universityLocalNatureOfContent: {
            source: 'local',
            name: getTestEntityValue('C410964_universityLocalNatureOfContent'),
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

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          // Create shared nature of content
          NatureOfContentConsortiumManager.createViaApi(testData.centralSharedNatureOfContent).then(
            (newNatureOfContent) => {
              testData.centralSharedNatureOfContent = newNatureOfContent;
            },
          );

          // Create local nature of content in central tenant
          NatureOfContent.createViaApi(testData.centralLocalNatureOfContent).then((response) => {
            testData.centralLocalNatureOfContent.id = response.body.id;
          });

          // Create local nature of content in college tenant
          cy.setTenant(Affiliations.College);
          NatureOfContent.createViaApi(testData.collegeLocalNatureOfContent).then((response) => {
            testData.collegeLocalNatureOfContent.id = response.body.id;
          });

          // Create local nature of content in university tenant
          cy.setTenant(Affiliations.University);
          NatureOfContent.createViaApi(testData.universityLocalNatureOfContent).then((response) => {
            testData.universityLocalNatureOfContent.id = response.body.id;
          });

          // Create user without the required permission
          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.crudNatureOfContent.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            // Assign affiliation to college tenant only
            cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
            cy.setTenant(Affiliations.College);
            // Assign a different permission (Finance: View fiscal year) instead of nature of content permission
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.uiFinanceViewFiscalYear.gui,
            ]);

            cy.resetTenant();
            cy.login(testData.user.username, testData.user.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          NatureOfContent.deleteViaApi(testData.centralLocalNatureOfContent.id);
          NatureOfContentConsortiumManager.deleteViaApi(testData.centralSharedNatureOfContent);
          Users.deleteViaApi(testData.user.userId);

          cy.setTenant(Affiliations.College);
          NatureOfContent.deleteViaApi(testData.collegeLocalNatureOfContent.id);

          cy.setTenant(Affiliations.University);
          NatureOfContent.deleteViaApi(testData.universityLocalNatureOfContent.id);
        });

        it(
          'C410964 User without "inventory-storage.nature-of-content-terms.collection.get" permission is NOT able to view the list of nature of content of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C410964'] },
          () => {
            // Step 1: Navigate to Consortium manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Nature of content settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            NatureOfContentConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Toast message should appear
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Verify shared nature of content is displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
              testData.centralSharedNatureOfContent.payload.name,
              constants.source.consortium,
              '',
              constants.memberLibraries.all,
            ]);

            // Step 4: Verify central local nature of content is displayed with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [testData.centralLocalNatureOfContent.name, 'local', '', tenantNames.central],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 5: Verify college local nature of content is NOT displayed
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalNatureOfContent.name,
            // );

            // Step 6: Verify university local nature of content is NOT displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalNatureOfContent.name,
            );

            // Step 7: Open Select members modal and verify its state
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 8: Uncheck all members
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(2, 0, false);

            // Step 9: Save and verify empty list
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(0);
            ConsortiumManagerApp.verifyListIsEmpty();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);
          },
        );
      });
    });
  });
});
