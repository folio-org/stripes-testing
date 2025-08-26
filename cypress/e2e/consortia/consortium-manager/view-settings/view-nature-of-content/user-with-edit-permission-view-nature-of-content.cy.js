import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import NatureOfContentConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/natureOfContentConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import NatureOfContent from '../../../../../support/fragments/settings/inventory/instances/natureOfContent';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Nature of content', () => {
        const testData = {
          centralSharedNatureOfContent: {
            payload: {
              name: getTestEntityValue('C410963_centralSharedNatureOfContent'),
            },
          },
          centralLocalNatureOfContent: {
            name: getTestEntityValue('C410963_centralLocalNatureOfContent'),
            source: 'local',
          },
          collegeLocalNatureOfContent: {
            name: getTestEntityValue('C410963_collegeLocalNatureOfContent'),
            source: 'local',
          },
          universityLocalNatureOfContent: {
            name: getTestEntityValue('C410963_universityLocalNatureOfContent'),
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

        before('Create test data', () => {
          cy.getAdminToken()
            .then(() => {
              NatureOfContentConsortiumManager.createViaApi(
                testData.centralSharedNatureOfContent,
              ).then((newNatureOfContent) => {
                testData.centralSharedNatureOfContent = newNatureOfContent;
              });
            })
            .then(() => {
              cy.resetTenant();
              NatureOfContent.createViaApi(testData.centralLocalNatureOfContent).then(
                (response) => {
                  testData.centralLocalNatureOfContent.id = response.body.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              NatureOfContent.createViaApi(testData.collegeLocalNatureOfContent).then(
                (response) => {
                  testData.collegeLocalNatureOfContent.id = response.body.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              NatureOfContent.createViaApi(testData.universityLocalNatureOfContent).then(
                (response) => {
                  testData.universityLocalNatureOfContent.id = response.body.id;
                },
              );
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.createTempUser([Permissions.crudNatureOfContent.gui]).then((userProperties) => {
                testData.user = userProperties;

                cy.resetTenant();
                cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                  Permissions.crudNatureOfContent.gui,
                ]);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.crudNatureOfContent.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.waitForAuthRefresh(() => {
                cy.login(testData.user.username, testData.user.password);
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
                cy.reload();
                ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              }, 20_000);
              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
              // Without waiter, permissions aren't loading
              cy.wait(10000);
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          NatureOfContentConsortiumManager.deleteViaApi(testData.centralSharedNatureOfContent);
          NatureOfContent.deleteViaApi(testData.centralLocalNatureOfContent.id);
          cy.setTenant(Affiliations.College);
          Users.deleteViaApi(testData.user.userId);
          NatureOfContent.deleteViaApi(testData.collegeLocalNatureOfContent.id);
          cy.setTenant(Affiliations.University);
          NatureOfContent.deleteViaApi(testData.universityLocalNatureOfContent.id);
        });

        it(
          'C410963 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of nature of content of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C410963'] },
          () => {
            // Step 1: Navigate to Consortium manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2-4: Open Select members modal, uncheck University tenant, and save
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
            SelectMembers.checkMember(tenantNames.university, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 5: Navigate to Nature of content settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            NatureOfContentConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 6: Verify shared nature of content is displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
              testData.centralSharedNatureOfContent.payload.name,
              constants.source.consortium,
              `${moment().format('l')} by`,
              constants.memberLibraries.all,
            ]);

            // Step 7: Verify central local nature of content is displayed with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalNatureOfContent.name,
              tenantNames.central,
              [
                testData.centralLocalNatureOfContent.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 8: Verify college local nature of content is displayed with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalNatureOfContent.name,
              tenantNames.college,
              [
                testData.collegeLocalNatureOfContent.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 9: Verify university local nature of content is NOT displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalNatureOfContent.name,
            );

            // Step 10-12: Open Select members modal, uncheck College tenant, and save
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 1, false);
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            // Step 13: Verify shared nature of content is still displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
              testData.centralSharedNatureOfContent.payload.name,
              constants.source.consortium,
              `${moment().format('l')} by`,
              constants.memberLibraries.all,
            ]);

            // Step 14: Verify central local nature of content is still displayed with actions
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalNatureOfContent.name,
              tenantNames.central,
              [
                testData.centralLocalNatureOfContent.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 15: Verify college local nature of content is NOT displayed anymore
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.collegeLocalNatureOfContent.name,
            );

            // Step 16: Verify university local nature of content is still NOT displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.universityLocalNatureOfContent.name,
            );
          },
        );
      });
    });
  });
});
