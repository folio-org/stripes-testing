import moment from 'moment';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../../../support/constants';
import HoldingsSourcesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsSourcesConsortiumManager';
import HoldingsSources from '../../../../../support/fragments/settings/inventory/holdings/holdingsSources';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';

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
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Consortia-Settings Consortium-Manager',
          action: CAPABILITY_ACTIONS.VIEW,
        },
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Consortia-Settings Consortium-Manager',
          action: CAPABILITY_ACTIONS.EDIT,
        },
        {
          type: CAPABILITY_TYPES.SETTINGS,
          resource: 'UI-Inventory Settings Holdings-Sources',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ];
      const capabSetsToAssignMembers = [
        {
          type: CAPABILITY_TYPES.DATA,
          resource: 'UI-Finance Fiscal-Year',
          action: CAPABILITY_ACTIONS.VIEW,
        },
      ];
      let tempUserC648471;

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
            tempUserC648471 = userProperties;
            if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.userA.userId, []);

            cy.assignCapabilitiesToExistingUser(
              tempUserC648471.userId,
              [],
              capabSetsToAssignCentral,
            );
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, tempUserC648471.userId);
            cy.setTenant(Affiliations.College);
            cy.assignCapabilitiesToExistingUser(
              tempUserC648471.userId,
              [],
              capabSetsToAssignMembers,
            );
            HoldingsSources.createViaApi(testData.collegeLocalSource).then((sourceId) => {
              testData.collegeLocalSource.id = sourceId.body.id;
            });
            cy.resetTenant();
            cy.getAdminToken();

            cy.setTenant(Affiliations.University);
            HoldingsSources.createViaApi(testData.universityLocalSource).then((sourceId) => {
              testData.universityLocalSource.id = sourceId.body.id;
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
        Users.deleteViaApi(tempUserC648471.userId);
      });

      it(
        'C648475 User with "Consortium manager: Can share settings to all members" permission is able to add/delete holdings source shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          cy.resetTenant();
          cy.login(tempUserC648471.username, tempUserC648471.password);
          // Without waiter, permissions aren't loading
          cy.wait(10000);
          TopMenuNavigation.navigateToApp('Consortium manager');
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
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

          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.collegeLocalSource.name,
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.universityLocalSource.name,
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);
          SelectMembers.selectMembers(tenantNames.central);
          SelectMembers.selectMembers(tenantNames.college);
          SelectMembers.saveAndClose();
        },
      );
    });
  });
});
