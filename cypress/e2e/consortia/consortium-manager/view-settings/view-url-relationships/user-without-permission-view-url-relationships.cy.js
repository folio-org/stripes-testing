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
import UrlRelationshipConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/urlRelationshipConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import UrlRelationship from '../../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
// import InteractorsTools from '../../../../../support/utils/interactorsTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View URL relationship', () => {
        const testData = {
          centralSharedUrlRelationship: {
            payload: {
              name: getTestEntityValue('C411362_centralSharedUrlRelationship'),
            },
          },
          centralLocalUrlRelationship: {
            name: getTestEntityValue('C411362_centralLocalUrlRelationship'),
            source: 'local',
          },
          collegeLocalUrlRelationship: {
            name: getTestEntityValue('C411362_collegeLocalUrlRelationship'),
            source: 'local',
          },
          universityLocalUrlRelationship: {
            name: getTestEntityValue('C411362_universityLocalUrlRelationship'),
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
        let tempUserC411362;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          UrlRelationshipConsortiumManager.createViaApi(testData.centralSharedUrlRelationship).then(
            (newUrlRelationship) => {
              testData.centralSharedUrlRelationship.id = newUrlRelationship.id;
            },
          );
          UrlRelationship.createViaApi(testData.centralLocalUrlRelationship).then(
            (urlRelationshipId) => {
              testData.centralLocalUrlRelationship.id = urlRelationshipId.id;
            },
          );

          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerView.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiCreateEditDeleteURL.gui,
          ]).then((userProperties) => {
            tempUserC411362 = userProperties;

            // Assign affiliation to College (member-1) but NOT University (member-2)
            cy.assignAffiliationToUser(Affiliations.College, tempUserC411362.userId);

            // Set up College (member-1) tenant with Finance permissions (no URL relationship permission)
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(tempUserC411362.userId, [
              Permissions.uiFinanceViewFiscalYear.gui,
            ]);
            UrlRelationship.createViaApi(testData.collegeLocalUrlRelationship).then(
              (urlRelationshipId) => {
                testData.collegeLocalUrlRelationship.id = urlRelationshipId.id;
              },
            );

            // Set up University (member-2) tenant - user has no affiliation here
            cy.setTenant(Affiliations.University);
            UrlRelationship.createViaApi(testData.universityLocalUrlRelationship).then(
              (urlRelationshipId) => {
                testData.universityLocalUrlRelationship.id = urlRelationshipId.id;
              },
            );
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          UrlRelationship.deleteViaApi(testData.centralLocalUrlRelationship.id);
          UrlRelationshipConsortiumManager.deleteViaApi(testData.centralSharedUrlRelationship);
          Users.deleteViaApi(tempUserC411362.userId);

          cy.withinTenant(Affiliations.College, () => {
            UrlRelationship.deleteViaApi(testData.collegeLocalUrlRelationship.id);
          });
          cy.withinTenant(Affiliations.University, () => {
            UrlRelationship.deleteViaApi(testData.universityLocalUrlRelationship.id);
          });
        });

        it(
          'C411362 User without "inventory-storage.electronic-access-relationships.collection.get" permission is NOT able to view the list of URL relationship of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411362'] },
          () => {
            cy.resetTenant();
            cy.login(tempUserC411362.username, tempUserC411362.password);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            // Only 2 members should be available (Central and College) since user has no affiliation to University
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Navigate to URL relationship and expect permission error
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            UrlRelationshipConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown();

            // Verify permission error toast message appears
            // TO DO: uncomment after EUREKA-536 is done
            // InteractorsTools.checkCalloutExists(messages.noPermission(tenantNames.college));

            // Step 3: Verify shared URL relationship is visible
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedUrlRelationship.payload.name,
              constants.memberLibraries.all,
              [
                testData.centralSharedUrlRelationship.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 4: Verify central local URL relationship is visible with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalUrlRelationship.name,
              tenantNames.central,
              [
                testData.centralLocalUrlRelationship.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 5: Verify college (member-1) local URL relationship is NOT visible
            // TO DO: uncomment after EUREKA-536 is done
            // ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            //   testData.collegeLocalUrlRelationship.name,
            // );

            // Step 6: Verify university (member-2) local URL relationship is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalUrlRelationship.name,
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
