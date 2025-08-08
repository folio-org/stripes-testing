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
import StatisticalCodesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/statisticalCodesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import StatisticalCodes from '../../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Statistical codes', () => {
        const testData = {
          centralSharedStatisticalCode: {
            payload: {
              name: getTestEntityValue('C411582_centralSharedStatisticalCode'),
              code: getTestEntityValue('C411582_centralSharedCode'),
            },
          },
          centralLocalStatisticalCode: {
            name: getTestEntityValue('C411582_centralLocalStatisticalCode'),
            code: getTestEntityValue('C411582_centralLocalCode'),
            source: 'local',
          },
          collegeLocalStatisticalCode: {
            name: getTestEntityValue('C411582_collegeLocalStatisticalCode'),
            code: getTestEntityValue('C411582_collegeLocalCode'),
            source: 'local',
          },
          universityLocalStatisticalCode: {
            name: getTestEntityValue('C411582_universityLocalStatisticalCode'),
            code: getTestEntityValue('C411582_universityLocalCode'),
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
        let tempUserC411582;
        let statisticalCodeType;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          // Get statistical code type for creating codes
          cy.getStatisticalCodeTypes({ limit: 1, query: 'source=folio' }).then((types) => {
            statisticalCodeType = types[0];
            // Create shared statistical code
            testData.centralSharedStatisticalCode.payload.statisticalCodeTypeId =
              statisticalCodeType.id;
            StatisticalCodesConsortiumManager.createViaApi(
              testData.centralSharedStatisticalCode,
            ).then((response) => {
              testData.centralSharedStatisticalCode = response;
            });

            // Create central local statistical code
            testData.centralLocalStatisticalCode.statisticalCodeTypeId = statisticalCodeType.id;
            StatisticalCodes.createViaApi(testData.centralLocalStatisticalCode).then((response) => {
              testData.centralLocalStatisticalCode.id = response.id;
            });

            cy.createTempUser([
              Permissions.consortiaSettingsConsortiumManagerView.gui,
              Permissions.consortiaSettingsConsortiumManagerEdit.gui,
              Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
            ]).then((userProperties) => {
              tempUserC411582 = userProperties;

              // Assign affiliation to College (member-1) but NOT University (member-2)
              cy.assignAffiliationToUser(Affiliations.College, tempUserC411582.userId);

              // Set up College (member-1) tenant with Finance permissions (no statistical codes permission)
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(tempUserC411582.userId, [
                Permissions.uiFinanceViewFiscalYear.gui,
              ]);
              testData.collegeLocalStatisticalCode.statisticalCodeTypeId = statisticalCodeType.id;
              StatisticalCodes.createViaApi(testData.collegeLocalStatisticalCode).then(
                (response) => {
                  testData.collegeLocalStatisticalCode.id = response.id;
                },
              );

              // Set up University (member-2) tenant - user has no affiliation here
              cy.setTenant(Affiliations.University);
              testData.universityLocalStatisticalCode.statisticalCodeTypeId =
                statisticalCodeType.id;
              StatisticalCodes.createViaApi(testData.universityLocalStatisticalCode).then(
                (response) => {
                  testData.universityLocalStatisticalCode.id = response.id;
                },
              );
            });
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          StatisticalCodes.deleteViaApi(testData.centralLocalStatisticalCode.id);
          StatisticalCodesConsortiumManager.deleteViaApi(testData.centralSharedStatisticalCode);
          Users.deleteViaApi(tempUserC411582.userId);

          cy.withinTenant(Affiliations.College, () => {
            StatisticalCodes.deleteViaApi(testData.collegeLocalStatisticalCode.id);
          });
          cy.withinTenant(Affiliations.University, () => {
            StatisticalCodes.deleteViaApi(testData.universityLocalStatisticalCode.id);
          });
        });

        it(
          'C411582 User without "inventory-storage.statistical-codes.collection.get" permission is NOT able to view the list of statistical codes of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411582'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411582.username, tempUserC411582.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            // Only 2 members should be available (Central and College) since user has no affiliation to University
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to statistical codes and expect permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            StatisticalCodesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Verify shared statistical code is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedStatisticalCode.payload.code,
              constants.memberLibraries.all,
              [
                testData.centralSharedStatisticalCode.payload.code,
                testData.centralSharedStatisticalCode.payload.name,
                statisticalCodeType.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 4: Verify central local statistical code is visible with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalStatisticalCode.code,
              tenantNames.central,
              [
                testData.centralLocalStatisticalCode.code,
                testData.centralLocalStatisticalCode.name,
                statisticalCodeType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 5: Verify college (member-1) local statistical code is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalStatisticalCode.code,
            // );

            // Step 6: Verify university (member-2) local statistical code is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalStatisticalCode.code,
            );

            // Step 7: Click Select members to verify modal state
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 8: Uncheck all members
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.checkMember(tenantNames.college, false);
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
