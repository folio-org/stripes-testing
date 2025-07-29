import moment from 'moment';
import { calloutTypes } from '../../../../../../interactors';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ClassificationIdentifierTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/classificationIdentifierTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ClassificationTypes from '../../../../../support/fragments/settings/inventory/classification-types/classificationTypes';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Classification identifier types', () => {
        let userAData;
        let userBData;
        const classificationType4 = {
          name: '',
        };
        const classificationType5 = {
          name: getTestEntityValue('Shared_classification_identifier_type_5'),
        };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.crudClassificationIdentifierTypes.gui,
              ]).then((userProperties) => {
                userAData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userAData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userAData.userId, [
                  Permissions.uiOrganizationsView.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.getAdminToken();
              cy.createTempUser([Permissions.crudClassificationIdentifierTypes.gui]).then(
                (userProperties) => {
                  userBData = userProperties;
                  cy.assignAffiliationToUser(Affiliations.College, userBData.userId);
                  cy.setTenant(Affiliations.College);
                  cy.assignPermissionsToExistingUser(userBData.userId, [
                    Permissions.crudClassificationIdentifierTypes.gui,
                  ]);
                  cy.resetTenant();
                  cy.getAdminToken();
                  cy.assignAffiliationToUser(Affiliations.University, userBData.userId);
                  cy.setTenant(Affiliations.University);
                  cy.assignPermissionsToExistingUser(userBData.userId, [
                    Permissions.crudClassificationIdentifierTypes.gui,
                  ]);
                },
              );
            })
            .then(() => {
              cy.resetTenant();
              cy.login(userAData.username, userAData.password);
            });
        });

        after('Delete users data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userAData.userId);
          Users.deleteViaApi(userBData.userId);
          ClassificationTypes.getClassificationTypesViaApi({
            limit: 1,
            query: `name=="${classificationType4.name}"`,
          }).then((citResp) => {
            const citId = citResp.classificationTypes[0].id;
            ClassificationIdentifierTypesConsortiumManager.deleteViaApi({
              payload: {
                name: classificationType4.name,
                id: citId,
                source: 'consortium',
              },
              settingId: citId,
              url: '/classification-types',
            });
          });
        });

        it(
          'C410902 Classification identifier type can be shared to all tenants in "Consortium manager" app regardless permission and affiliation (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C410902'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ClassificationIdentifierTypesConsortiumManager.choose();
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );

            ConsortiaControlledVocabularyPaneset.createViaUi(true, classificationType4);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.pleaseFillIn,
            });

            classificationType4.name = getTestEntityValue(
              'Shared_classification_identifier_type_4',
            );
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: classificationType4.name,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            const createdCIT = [
              classificationType4.name,
              'consortium',
              moment().format('l'),
              'All',
            ];

            ConfirmShare.waitLoadingConfirmShareToAll(classificationType4.name);
            ConfirmShare.clickConfirm();
            ClassificationIdentifierTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(classificationType4.name, 'All'));
            ConsortiumManagerApp.checkMessage(
              messages.noPermission(tenantNames.college),
              calloutTypes.error,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, classificationType5);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(classificationType5.name);
            ConfirmShare.clickKeepEditing();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            cy.logout();
            cy.login(userBData.username, userBData.password, {
              path: SettingsMenu.classificationTypes,
              waiter: () => cy.wait(4000),
            });
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.classificationTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.classificationTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT.slice(0, -1));
          },
        );
      });
    });
  });
});
