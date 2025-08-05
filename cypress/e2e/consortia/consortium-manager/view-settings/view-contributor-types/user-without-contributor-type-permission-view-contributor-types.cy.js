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
import ContributorTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/contributorTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ContributorTypes from '../../../../../support/fragments/settings/inventory/instances/contributorTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Contributor types', () => {
        const testData = {
          centralSharedContributorType: {
            payload: {
              name: getTestEntityValue('C411515_centralSharedContributorType'),
              code: getTestEntityValue('C411515_sharedCode'),
            },
          },
          centralLocalContributorType: {
            name: getTestEntityValue('C411515_centralLocalContributorType'),
            code: getTestEntityValue('C411515_centralCode'),
            source: 'local',
          },
          collegeLocalContributorType: {
            name: getTestEntityValue('C411515_collegeLocalContributorType'),
            code: getTestEntityValue('C411515_collegeCode'),
            source: 'local',
          },
          universityLocalContributorType: {
            name: getTestEntityValue('C411515_universityLocalContributorType'),
            code: getTestEntityValue('C411515_universityCode'),
            source: 'local',
          },
        };

        const consortiumSource = 'consortium';
        let tempUserC411515;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          ContributorTypesConsortiumManager.createViaApi(
            testData.centralSharedContributorType,
          ).then((newContributorType) => {
            testData.centralSharedContributorType.id = newContributorType.id;
          });
          ContributorTypes.createViaApi(testData.centralLocalContributorType).then(
            (contributorTypeId) => {
              testData.centralLocalContributorType.id = contributorTypeId.body.id;
            },
          );

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.crudContributorTypes.gui,
          ]).then((userProperties) => {
            tempUserC411515 = userProperties;

            // Assign affiliation to College (member-1) but NOT University (member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC411515.userId);

            // Set up College (member-1) tenant with Finance permissions (no contributor types permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC411515.userId, [
              Permissions.uiFinanceViewFiscalYear.gui,
            ]);
            ContributorTypes.createViaApi(testData.collegeLocalContributorType).then(
              (contributorTypeId) => {
                testData.collegeLocalContributorType.id = contributorTypeId.body.id;
              },
            );

            // Set up University (member-2) tenant - user has no affiliation here
            cy.setTenant(Affiliations.University);
            ContributorTypes.createViaApi(testData.universityLocalContributorType).then(
              (contributorTypeId) => {
                testData.universityLocalContributorType.id = contributorTypeId.body.id;
              },
            );
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.withinTenant(Affiliations.University, () => {
            ContributorTypes.deleteViaApi(testData.universityLocalContributorType.id);
          });
          cy.withinTenant(Affiliations.College, () => {
            ContributorTypes.deleteViaApi(testData.collegeLocalContributorType.id);
          });

          cy.resetTenant();
          ContributorTypes.deleteViaApi(testData.centralLocalContributorType.id);
          ContributorTypesConsortiumManager.deleteViaApi(testData.centralSharedContributorType);
          Users.deleteViaApi(tempUserC411515.userId);
        });

        it(
          'C411515 User without "inventory-storage.contributor-types.collection.get" permission is NOT able to view the list of contributor types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411515'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411515.username, tempUserC411515.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            // Only 2 members should be available (Central and College) since user has no affiliation to University
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to Contributor types and expect permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ContributorTypesConsortiumManager.choose();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Verify shared contributor type is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedContributorType.payload.name,
              consortiumSource,
              [
                testData.centralSharedContributorType.payload.name,
                testData.centralSharedContributorType.payload.code,
                consortiumSource,
                `${moment().format('l')} by`,
                'All',
              ],
            );

            // Step 4: Verify central local contributor type is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalContributorType.name,
              tenantNames.central,
              [
                testData.centralLocalContributorType.name,
                testData.centralLocalContributorType.code,
                'local',
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 5: Verify college (member-1) local contributor type is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalContributorType.name,
            // );

            // Step 6: Verify university (member-2) local contributor type is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalContributorType.name,
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
