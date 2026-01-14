import moment from 'moment';
import {
  APPLICATION_NAMES,
  CAPABILITY_ACTIONS,
  CAPABILITY_TYPES,
} from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import HoldingsSourcesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsSourcesConsortiumManager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import HoldingsSources from '../../../../../support/fragments/settings/inventory/holdings/holdingsSources';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Holdings sources', () => {
      const testData = {
        centralSharedSource: {
          payload: {
            name: getTestEntityValue('centralSharedSource_name'),
          },
        },
        centralLocalSource: {
          name: getTestEntityValue('centralLocalSource_name'),
        },
        collegeLocalSource: {
          name: getTestEntityValue('collegeLocalSource_name'),
        },
        universityLocalSource: {
          name: getTestEntityValue('universityLocalSource_name'),
        },
      };

      const capabSetsToAssignCentral = [
        {
          type: CAPABILITY_TYPES.SETTINGS,
          resource: 'UI-Inventory Settings Holdings-Sources',
          action: CAPABILITY_ACTIONS.VIEW,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Consortia-Settings Consortium-Manager',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ];
      const capabSetsToAssignMembers = [
        {
          type: CAPABILITY_TYPES.SETTINGS,
          resource: 'UI-Inventory Settings Holdings-Sources',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ];
      let tempUserC648469;
      let tempUserC648472;

      before('create test data', () => {
        cy.clearCookies({ domain: null });
        cy.getAdminToken();
        HoldingsSourcesConsortiumManager.createViaApi(testData.centralSharedSource).then(
          (newSource) => {
            testData.centralSharedType = newSource.id;
          },
        );
        HoldingsSources.createViaApi(testData.centralLocalSource).then((sourceId) => {
          testData.centralLocalSource.id = sourceId.body.id;
        });

        cy.createTempUser([])
          .then((userProperties) => {
            tempUserC648469 = userProperties;
            if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, []);

            cy.assignCapabilitiesToExistingUser(
              tempUserC648469.userId,
              [],
              capabSetsToAssignCentral,
            );
          })
          .then(() => {
            cy.createTempUser([])
              .then((userPropertiesC648472) => {
                tempUserC648472 = userPropertiesC648472;
                if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, []);

                cy.assignCapabilitiesToExistingUser(
                  tempUserC648472.userId,
                  [],
                  capabSetsToAssignCentral,
                );
              })
              .then(() => {
                cy.assignAffiliationToUser(Affiliations.College, tempUserC648469.userId);
                cy.setTenant(Affiliations.College);
                cy.assignCapabilitiesToExistingUser(
                  tempUserC648469.userId,
                  [],
                  capabSetsToAssignMembers,
                );
                cy.assignCapabilitiesToExistingUser(
                  tempUserC648472.userId,
                  [],
                  capabSetsToAssignMembers,
                );
                HoldingsSources.createViaApi(testData.collegeLocalSource).then((sourceId) => {
                  testData.collegeLocalSource.id = sourceId.body.id;
                });
                cy.resetTenant();
                cy.getAdminToken();

                cy.assignAffiliationToUser(Affiliations.University, tempUserC648469.userId);
                cy.setTenant(Affiliations.University);
                cy.assignCapabilitiesToExistingUser(
                  tempUserC648469.userId,
                  [],
                  capabSetsToAssignMembers,
                );
                cy.assignCapabilitiesToExistingUser(
                  tempUserC648472.userId,
                  [],
                  capabSetsToAssignMembers,
                );
                HoldingsSources.createViaApi(testData.universityLocalSource).then((sourceId) => {
                  testData.universityLocalSource.id = sourceId.body.id;
                });
              });
          });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        cy.withinTenant(Affiliations.University, () => {
          HoldingsSources.deleteViaApi(testData.universityLocalSource.id);
        });
        cy.resetTenant();
        cy.getAdminToken();
        cy.withinTenant(Affiliations.College, () => {
          HoldingsSources.deleteViaApi(testData.collegeLocalSource.id);
        });

        cy.setTenant(Affiliations.Consortia);
        cy.getAdminToken();
        HoldingsSources.deleteViaApi(testData.centralLocalSource.id);
        HoldingsSourcesConsortiumManager.deleteViaApi(testData.centralSharedSource);
        Users.deleteViaApi(tempUserC648469.userId);
      });

      it(
        'C648469 User with "Consortium manager: Can view existing settings" permission is able to view the list of holdings sources of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C648469'] },
        () => {
          cy.resetTenant();
          cy.login(tempUserC648469.username, tempUserC648469.password);
          // Without waiter, permissions aren't loading
          cy.wait(10000);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          HoldingsSourcesConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralSharedSource.payload.name,
            'consortium',
            [
              testData.centralSharedSource.payload.name,
              'consortium',
              `${moment().format('l')} by`,
              'All',
            ],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralLocalSource.name,
            tenantNames.central,
            [
              testData.centralLocalSource.name,
              '',
              `${moment().format('l')} by`,
              tenantNames.central,
            ],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.collegeLocalSource.name,
            tenantNames.college,
            [
              testData.collegeLocalSource.name,
              '',
              `${moment().format('l')} by`,
              tenantNames.college,
            ],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.universityLocalSource.name,
            tenantNames.university,
            [
              testData.universityLocalSource.name,
              '',
              `${moment().format('l')} by`,
              tenantNames.university,
            ],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
          SelectMembers.selectMembers(tenantNames.central);
          SelectMembers.saveAndClose();

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralSharedSource.payload.name,
            'consortium',
            [
              testData.centralSharedSource.payload.name,
              'consortium',
              `${moment().format('l')} by`,
              'All',
            ],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.centralLocalSource.name,
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.collegeLocalSource.name,
            tenantNames.college,
            [
              testData.collegeLocalSource.name,
              '',
              `${moment().format('l')} by`,
              tenantNames.college,
            ],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.universityLocalSource.name,
            tenantNames.university,
            [
              testData.universityLocalSource.name,
              '',
              `${moment().format('l')} by`,
              tenantNames.university,
            ],
            [actionIcons.edit, actionIcons.trash],
          );
        },
      );

      it(
        'C648472 User with "Consortium manager: Can share settings to all members" permission is able to view the list of holdings sources of affiliated tenants in "Consortium manager" app (Consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C648472'] },
        () => {
          cy.resetTenant();
          cy.login(tempUserC648472.username, tempUserC648472.password);
          // Without waiter, permissions aren't loading
          cy.wait(10000);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          HoldingsSourcesConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralSharedSource.payload.name,
            'consortium',
            [
              testData.centralSharedSource.payload.name,
              'consortium',
              `${moment().format('l')} by`,
              'All',
            ],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralLocalSource.name,
            tenantNames.central,
            [
              testData.centralLocalSource.name,
              '',
              `${moment().format('l')} by`,
              tenantNames.central,
            ],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.collegeLocalSource.name,
            tenantNames.college,
            [
              testData.collegeLocalSource.name,
              '',
              `${moment().format('l')} by`,
              tenantNames.college,
            ],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.universityLocalSource.name,
            tenantNames.university,
            [
              testData.universityLocalSource.name,
              '',
              `${moment().format('l')} by`,
              tenantNames.university,
            ],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
          SelectMembers.selectMembers(tenantNames.college);
          SelectMembers.selectMembers(tenantNames.university);
          SelectMembers.saveAndClose();

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralSharedSource.payload.name,
            'consortium',
            [
              testData.centralSharedSource.payload.name,
              'consortium',
              `${moment().format('l')} by`,
              'All',
            ],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.centralLocalSource.name,
            tenantNames.central,
            [
              testData.centralLocalSource.name,
              '',
              `${moment().format('l')} by`,
              tenantNames.central,
            ],
            [actionIcons.edit, actionIcons.trash],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.collegeLocalSource.name,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.universityLocalSource.name,
          );
        },
      );
    });
  });
});
