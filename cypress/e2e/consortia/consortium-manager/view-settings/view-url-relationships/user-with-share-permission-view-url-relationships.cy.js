import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import UrlRelationshipConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/urlRelationshipConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import UrlRelationship from '../../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View URL relationship', () => {
        const testData = {
          centralSharedUrlRelationship: {
            payload: {
              name: getTestEntityValue('C411363_centralSharedUrlRelationship'),
            },
          },
          centralLocalUrlRelationship: {
            name: getTestEntityValue('C411363_centralLocalUrlRelationship'),
            source: 'local',
          },
          collegeLocalUrlRelationship: {
            name: getTestEntityValue('C411363_collegeLocalUrlRelationship'),
            source: 'local',
          },
          universityLocalUrlRelationship: {
            name: getTestEntityValue('C411363_universityLocalUrlRelationship'),
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
        let tempUserC411363;

        before('Create test data', () => {
          cy.clearCookies({ domain: null });
          cy.resetTenant();
          cy.getAdminToken();
          UrlRelationshipConsortiumManager.createViaApi(testData.centralSharedUrlRelationship).then(
            (newUrlRelationship) => {
              testData.centralSharedUrlRelationship = newUrlRelationship;
            },
          );
          UrlRelationship.createViaApi(testData.centralLocalUrlRelationship).then(
            (urlRelationshipId) => {
              testData.centralLocalUrlRelationship.id = urlRelationshipId.id;
            },
          );

          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.uiCreateEditDeleteURL.gui]).then((userProperties) => {
            tempUserC411363 = userProperties;
            UrlRelationship.createViaApi(testData.collegeLocalUrlRelationship).then(
              (urlRelationshipId) => {
                testData.collegeLocalUrlRelationship.id = urlRelationshipId.id;
              },
            );

            cy.resetTenant();
            // Assign affiliations: user created in College (member-1), affiliated with Central and University (member-2)
            cy.assignAffiliationToUser(Affiliations.University, tempUserC411363.userId);
            cy.assignPermissionsToExistingUser(tempUserC411363.userId, [
              Permissions.consortiaSettingsConsortiumManagerShare.gui,
              Permissions.uiCreateEditDeleteURL.gui,
            ]);

            // Set up permissions in University (member-2) tenant
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(tempUserC411363.userId, [
              Permissions.uiCreateEditDeleteURL.gui,
            ]);
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

          cy.withinTenant(Affiliations.College, () => {
            Users.deleteViaApi(tempUserC411363.userId);
            UrlRelationship.deleteViaApi(testData.collegeLocalUrlRelationship.id);
          });
          cy.withinTenant(Affiliations.University, () => {
            UrlRelationship.deleteViaApi(testData.universityLocalUrlRelationship.id);
          });
        });

        it(
          'C411363 User with "Consortium manager: Can share settings to all members" permission is able to view the list of URL relationship of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411363'] },
          () => {
            cy.resetTenant();
            cy.waitForAuthRefresh(() => {
              cy.login(tempUserC411363.username, tempUserC411363.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              cy.reload();
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            }, 20_000);
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            // Without waiter, permissions aren't loading
            cy.wait(10000);

            // Step 1: Navigate to Consortium Manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to URL relationship
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            UrlRelationshipConsortiumManager.choose();
            // Note: New button is NOT displayed since Trillium
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 3: Verify shared URL relationship (without Edit/Delete actions since Trillium)
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

            // Step 4: Verify central local URL relationship (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalUrlRelationship.name,
              tenantNames.central,
              [
                testData.centralLocalUrlRelationship.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );

            // Step 5: Verify college (member-1) local URL relationship (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalUrlRelationship.name,
              tenantNames.college,
              [
                testData.collegeLocalUrlRelationship.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            // Step 6: Verify university (member-2) local URL relationship (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalUrlRelationship.name,
              tenantNames.university,
              [
                testData.universityLocalUrlRelationship.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
            );

            // Step 7: Click Select members button
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);

            // Step 8: Uncheck member-1 (college) and member-2 (university) tenants
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.checkMember(tenantNames.university, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 1, false);

            // Step 9: Save with only central tenant selected
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 10: Verify shared URL relationship still visible (without Edit/Delete actions since Trillium)
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

            // Step 11: Verify central local URL relationship still visible (without Edit/Delete actions since Trillium)
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalUrlRelationship.name,
              tenantNames.central,
              [
                testData.centralLocalUrlRelationship.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );

            // Step 12: Verify college (member-1) local URL relationship is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalUrlRelationship.name,
            );

            // Step 13: Verify university (member-2) local URL relationship is NOT visible
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalUrlRelationship.name,
            );
          },
        );
      });
    });
  });
});
