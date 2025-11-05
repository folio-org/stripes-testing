import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ResourceIdentifierTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/resourceIdentifierTypesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ResourceIdentifierTypes from '../../../../../support/fragments/settings/inventory/instances/resourceIdentifierTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('View settings', () => {
      describe('View Resource identifier types', () => {
        const testData = {
          centralSharedResourceIdentifierType: {
            payload: {
              name: getTestEntityValue('C411308_centralSharedResourceIdentifierType'),
            },
          },
          centralLocalResourceIdentifierType: {
            name: getTestEntityValue('C411308_centralLocalResourceIdentifierType'),
            source: 'local',
          },
          collegeLocalResourceIdentifierType: {
            name: getTestEntityValue('C411308_collegeLocalResourceIdentifierType'),
            source: 'local',
          },
          universityLocalResourceIdentifierType: {
            name: getTestEntityValue('C411308_universityLocalResourceIdentifierType'),
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
              ResourceIdentifierTypesConsortiumManager.createViaApi(
                testData.centralSharedResourceIdentifierType,
              ).then((newResourceIdentifierType) => {
                testData.centralSharedResourceIdentifierType = newResourceIdentifierType;
              });
            })
            .then(() => {
              cy.resetTenant();
              ResourceIdentifierTypes.createViaApi(
                testData.centralLocalResourceIdentifierType,
              ).then((response) => {
                testData.centralLocalResourceIdentifierType.id = response.body.id;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              ResourceIdentifierTypes.createViaApi(
                testData.collegeLocalResourceIdentifierType,
              ).then((response) => {
                testData.collegeLocalResourceIdentifierType.id = response.body.id;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.University);
              ResourceIdentifierTypes.createViaApi(
                testData.universityLocalResourceIdentifierType,
              ).then((response) => {
                testData.universityLocalResourceIdentifierType.id = response.body.id;
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerView.gui,
                Permissions.crudResourceIdentifierTypes.gui,
              ]).then((userProperties) => {
                testData.user = userProperties;

                cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
                cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.crudResourceIdentifierTypes.gui,
                ]);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(testData.user.userId, [
                  Permissions.crudResourceIdentifierTypes.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(testData.user.username, testData.user.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
              // Without waiter, permissions aren't loading
              cy.wait(10000);
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          ResourceIdentifierTypesConsortiumManager.deleteViaApi(
            testData.centralSharedResourceIdentifierType,
          );
          ResourceIdentifierTypes.deleteViaApi(testData.centralLocalResourceIdentifierType.id);
          Users.deleteViaApi(testData.user.userId);
          cy.setTenant(Affiliations.College);
          ResourceIdentifierTypes.deleteViaApi(testData.collegeLocalResourceIdentifierType.id);
          cy.setTenant(Affiliations.University);
          ResourceIdentifierTypes.deleteViaApi(testData.universityLocalResourceIdentifierType.id);
        });

        it(
          'C411308 User with "Consortium manager: Can view existing settings" permission is able to view the list of resource identifier types of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411308'] },
          () => {
            // Step 1: Navigate to Consortium manager and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.verifyStatusOfConsortiumManager();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            // Step 2: Navigate to Resource identifier types settings
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ResourceIdentifierTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 3: Verify shared resource identifier type is displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedResourceIdentifierType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedResourceIdentifierType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 4: Verify central local resource identifier type is displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralLocalResourceIdentifierType.name,
              tenantNames.central,
              [
                testData.centralLocalResourceIdentifierType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.central,
              ],
            );

            // Step 5: Verify college local resource identifier type is displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalResourceIdentifierType.name,
              tenantNames.college,
              [
                testData.collegeLocalResourceIdentifierType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            // Step 6: Verify university local resource identifier type is displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalResourceIdentifierType.name,
              tenantNames.university,
              [
                testData.universityLocalResourceIdentifierType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
            );

            // Step 7-9: Open Select members modal, uncheck Central tenant, and save
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.verifyStatusOfSelectMembersModal(3, 2, false);
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 10: Verify shared resource identifier type is still displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.centralSharedResourceIdentifierType.payload.name,
              constants.source.consortium,
              [
                testData.centralSharedResourceIdentifierType.payload.name,
                constants.source.consortium,
                `${moment().format('l')} by`,
                constants.memberLibraries.all,
              ],
            );

            // Step 11: Verify central local resource identifier type is NOT displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.centralLocalResourceIdentifierType.name,
            );

            // Step 12: Verify college local resource identifier type is still displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.collegeLocalResourceIdentifierType.name,
              tenantNames.college,
              [
                testData.collegeLocalResourceIdentifierType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.college,
              ],
            );

            // Step 13: Verify university local resource identifier type is still displayed
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.universityLocalResourceIdentifierType.name,
              tenantNames.university,
              [
                testData.universityLocalResourceIdentifierType.name,
                constants.source.local,
                `${moment().format('l')} by`,
                tenantNames.university,
              ],
            );
          },
        );
      });
    });
  });
});
