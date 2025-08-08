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

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View URL relationship', () => {
        const testData = {
          centralSharedUrlRelationship: {
            payload: {
              name: getTestEntityValue('C411360_centralSharedUrlRelationship'),
            },
          },
          centralLocalUrlRelationship: {
            name: getTestEntityValue('C411360_centralLocalUrlRelationship'),
            source: 'local',
          },
          collegeLocalUrlRelationship: {
            name: getTestEntityValue('C411360_collegeLocalUrlRelationship'),
            source: 'local',
          },
          universityLocalUrlRelationship: {
            name: getTestEntityValue('C411360_universityLocalUrlRelationship'),
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
            university: tenantNames.university,
            college: tenantNames.college,
            central: tenantNames.central,
          },
        };

        before('Create test data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerView.gui,
                Permissions.uiCreateEditDeleteURL.gui,
              ]).then((userProperties) => {
                testData.user = userProperties;

                cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
                cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);

                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.uiCreateEditDeleteURL.gui,
                ]);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.uiCreateEditDeleteURL.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.getAdminToken();
              // Create shared URL relationship
              UrlRelationshipConsortiumManager.createViaApi(
                testData.centralSharedUrlRelationship,
              ).then((response) => {
                testData.centralSharedUrlRelationship = response;
              });
              // Create central local URL relationship
              UrlRelationship.createViaApi(testData.centralLocalUrlRelationship).then(
                (response) => {
                  testData.centralLocalUrlRelationship.id = response.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              // Create college local URL relationship
              UrlRelationship.createViaApi(testData.collegeLocalUrlRelationship).then(
                (response) => {
                  testData.collegeLocalUrlRelationship.id = response.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              // Create university local URL relationship
              UrlRelationship.createViaApi(testData.universityLocalUrlRelationship).then(
                (response) => {
                  testData.universityLocalUrlRelationship.id = response.id;
                },
              );
            })
            .then(() => {
              cy.resetTenant();
              cy.login(testData.user.username, testData.user.password);
              // Without waiter, permissions aren't loading
              cy.wait(10000);
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          UrlRelationshipConsortiumManager.deleteViaApi(testData.centralSharedUrlRelationship);
          UrlRelationship.deleteViaApi(testData.centralLocalUrlRelationship.id);
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.College);
          UrlRelationship.deleteViaApi(testData.collegeLocalUrlRelationship.id);
          cy.setTenant(Affiliations.University);
          UrlRelationship.deleteViaApi(testData.universityLocalUrlRelationship.id);
        });

        it(
          'C411360 User with "Consortium manager: Can view existing settings" permission is able to view the list of URL relationship of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411360'] },
          () => {
            // Step 1: User opens "Consortium manager" app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();

            // Step 2: User expands "Members selection" accordion
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 3: User clicks on "Inventory" settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);

            // Step 4: User clicks on "Instance, holdings & item" > "URL relationship"
            UrlRelationshipConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 6: Verify shared URL relationship from Central tenant
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

            // Step 7: Verify central local URL relationship
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalUrlRelationship.name,
              constants.memberLibraries.central,
              [
                testData.centralLocalUrlRelationship.name,
                constants.source.local,
                `${moment().format('l')} by`,
                constants.memberLibraries.central,
              ],
            );

            // Step 8: Verify college local URL relationship
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalUrlRelationship.name,
              constants.memberLibraries.college,
              [
                testData.collegeLocalUrlRelationship.name,
                constants.source.local,
                `${moment().format('l')} by`,
                constants.memberLibraries.college,
              ],
            );

            // Step 9: Verify university local URL relationship
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalUrlRelationship.name,
              constants.memberLibraries.university,
              [
                testData.universityLocalUrlRelationship.name,
                constants.source.local,
                `${moment().format('l')} by`,
                constants.memberLibraries.university,
              ],
            );

            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

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

            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.centralLocalUrlRelationship.name,
            );

            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalUrlRelationship.name,
              constants.memberLibraries.college,
              [
                testData.collegeLocalUrlRelationship.name,
                constants.source.local,
                `${moment().format('l')} by`,
                constants.memberLibraries.college,
              ],
            );

            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalUrlRelationship.name,
              constants.memberLibraries.university,
              [
                testData.universityLocalUrlRelationship.name,
                constants.source.local,
                `${moment().format('l')} by`,
                constants.memberLibraries.university,
              ],
            );
          },
        );
      });
    });
  });
});
