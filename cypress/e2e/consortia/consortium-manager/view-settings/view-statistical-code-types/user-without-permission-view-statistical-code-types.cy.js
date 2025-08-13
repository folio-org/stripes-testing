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
import StatisticalCodeTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/statisticalCodeTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import StatisticalCodeTypes from '../../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodeTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Statistical code types', () => {
        const testData = {
          centralSharedStatisticalCodeType: {
            payload: {
              name: getTestEntityValue('C411337_centralSharedStatisticalCodeType'),
            },
          },
          centralLocalStatisticalCodeType: {
            name: getTestEntityValue('C411337_centralLocalStatisticalCodeType'),
            source: 'local',
          },
          collegeLocalStatisticalCodeType: {
            name: getTestEntityValue('C411337_collegeLocalStatisticalCodeType'),
            source: 'local',
          },
          universityLocalStatisticalCodeType: {
            name: getTestEntityValue('C411337_universityLocalStatisticalCodeType'),
            source: 'local',
          },
        };

        let tempUserC411337;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          StatisticalCodeTypesConsortiumManager.createViaApi(
            testData.centralSharedStatisticalCodeType,
          ).then((newStatisticalCodeType) => {
            testData.centralSharedStatisticalCodeType.id = newStatisticalCodeType.id;
          });
          StatisticalCodeTypes.createViaApi(testData.centralLocalStatisticalCodeType).then(
            (statisticalCodeTypeId) => {
              testData.centralLocalStatisticalCodeType.id = statisticalCodeTypeId.id;
            },
          );

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
          ]).then((userProperties) => {
            tempUserC411337 = userProperties;

            // Assign affiliation to College (member-1) only (NOT University member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC411337.userId);

            // Set up College (member-1) tenant with Finance permission (NOT statistical code types permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC411337.userId, [
              Permissions.uiFinanceViewFiscalYear.gui,
            ]);
            StatisticalCodeTypes.createViaApi(testData.collegeLocalStatisticalCodeType).then(
              (statisticalCodeTypeId) => {
                testData.collegeLocalStatisticalCodeType.id = statisticalCodeTypeId.id;
              },
            );

            // Set up University (member-2) tenant - user has no affiliation here but create test data
            cy.setTenant(Affiliations.University);
            StatisticalCodeTypes.createViaApi(testData.universityLocalStatisticalCodeType).then(
              (statisticalCodeTypeId) => {
                testData.universityLocalStatisticalCodeType.id = statisticalCodeTypeId.id;
              },
            );
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          StatisticalCodeTypes.deleteViaApi(testData.centralLocalStatisticalCodeType.id);
          StatisticalCodeTypesConsortiumManager.deleteViaApi(
            testData.centralSharedStatisticalCodeType,
          );
          Users.deleteViaApi(tempUserC411337.userId);

          cy.withinTenant(Affiliations.University, () => {
            StatisticalCodeTypes.deleteViaApi(testData.universityLocalStatisticalCodeType.id);
          });
          cy.withinTenant(Affiliations.College, () => {
            StatisticalCodeTypes.deleteViaApi(testData.collegeLocalStatisticalCodeType.id);
          });
        });

        it(
          'C411337 User without "inventory-storage.statistical-code-types.collection.get" permission is NOT able to view the list of statistical code types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411337'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411337.username, tempUserC411337.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Statistical code types and verify toast message
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            StatisticalCodeTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(
            //   messages.noPermission(tenantNames.college),
            // );

            // Step 3: Verify shared statistical code type is shown
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
              testData.centralSharedStatisticalCodeType.payload.name,
              'consortium',
              '',
              'All',
            ]);

            // Step 4: Verify central local statistical code type is shown with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [testData.centralLocalStatisticalCodeType.name, 'local', '', tenantNames.central],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 5: Verify college (member-1) local statistical code type is NOT shown
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalStatisticalCodeType.name,
            // );

            // Step 6: Verify university (member-2) local statistical code type is NOT shown
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalStatisticalCodeType.name,
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
