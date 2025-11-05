import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ClassificationIdentifierTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/classificationIdentifierTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Classification identifier types', () => {
        let userData;
        const classificationIdentifierType1 = {
          name: getTestEntityValue('Shared_classification_identifier_type_1'),
        };

        const classificationIdentifierType2 = {
          name: getTestEntityValue('Shared_classification_identifier_type_2'),
        };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.crudClassificationIdentifierTypes.gui,
              ]).then((userProperties) => {
                userData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.crudClassificationIdentifierTypes.gui,
                ]);
                cy.resetTenant();
                cy.getAdminToken();
                cy.assignAffiliationToUser(Affiliations.University, userData.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.crudClassificationIdentifierTypes.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(userData.username, userData.password);
            });
        });

        after('Delete users data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C410900 User with "Consortium manager: Can share settings to all members" permission is able to add/delete classification identifier type shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C410900'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ClassificationIdentifierTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, classificationIdentifierType1);
            ConsortiaControlledVocabularyPaneset.clickSave();
            const createdCIT = [
              classificationIdentifierType1.name,
              'consortium',
              moment().format('l'),
              'All',
            ];

            ConfirmShare.waitLoadingConfirmShareToAll(classificationIdentifierType1.name);
            ConfirmShare.clickConfirm();
            ClassificationIdentifierTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.created(classificationIdentifierType1.name, 'All'),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, classificationIdentifierType2);
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(classificationIdentifierType2.name);
            ConfirmShare.clickKeepEditing();
            ClassificationIdentifierTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, classificationIdentifierType1);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.notUnique('Name'),
            });

            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.performAction(
              classificationIdentifierType1.name,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              'classification identifier type',
              classificationIdentifierType1.name,
            );

            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdCIT, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.performAction(
              classificationIdentifierType1.name,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              'classification identifier type',
              classificationIdentifierType1.name,
            );
            DeleteCancelReason.clickDelete();
            ClassificationIdentifierTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(
                'classification identifier type',
                classificationIdentifierType1.name,
              ),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              classificationIdentifierType1.name,
            );

            cy.visit(SettingsMenu.classificationTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              classificationIdentifierType1.name,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.classificationTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              classificationIdentifierType1.name,
            );

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.classificationTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              classificationIdentifierType1.name,
            );
          },
        );
      });
    });
  });
});
