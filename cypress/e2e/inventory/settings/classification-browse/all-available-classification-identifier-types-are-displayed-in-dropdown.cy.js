import { Permissions } from '../../../../support/dictionary';
import { APPLICATION_NAMES } from '../../../../support/constants';
import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ClassificationBrowse from '../../../../support/fragments/settings/inventory/instances/classificationBrowse';
import ClassificationIdentifierTypes from '../../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Classification browse', () => {
      const localClassificationIdentifierType = {
        name: `C451642 Classification identifier type ${getRandomPostfix()}`,
      };
      let user;
      let classificationIdentifierTypeId;

      before('Create user, login', () => {
        cy.getAdminToken();
        ClassificationIdentifierTypes.createViaApi(localClassificationIdentifierType).then(
          (response) => {
            classificationIdentifierTypeId = response.body.id;
          },
        );

        cy.createTempUser([
          Permissions.uiInventorySettingsConfigureClassificationBrowse.gui,
          Permissions.crudClassificationIdentifierTypes.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
          cy.intercept('browse/config/instance-classification*').as('instanceClassifications');
          ClassificationBrowse.openClassificationBrowse();
          cy.wait('@instanceClassifications');
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        ClassificationIdentifierTypes.deleteViaApi(classificationIdentifierTypeId);
      });

      it(
        `C451642 All available "Classification identifier types" are displayed in "Classification identifier types" 
            multi-select dropdown element of each "Classification browse" option on "Classification browse" pane (spitfire)`,
        { tags: ['criticalPath', 'spitfire'] },
        () => {
          // 1 Click on the "Edit" (pencil) icon next to "Classification (all)" browse option.
          ClassificationBrowse.clickEditButtonInBrowseOption('Classification (all)');
          ClassificationBrowse.checkClassificationIdentifierTypesExistsInBrowseoption(
            'Classification (all)',
          );
          ClassificationBrowse.checkCancelButtonEnabledInBrowseOption('Classification (all)');
          ClassificationBrowse.checkSaveButtonEnabledInBrowseOption('Classification (all)', false);

          // 2 Click on the multi-select dropdown element displayed in the "Classification identifier types" column of "Classification (all)" browse option
          ClassificationBrowse.expandClassificationIdentifierTypesDropdownInBrowseOption(
            'Classification (all)',
          );
          ClassificationBrowse.checkClassificationIdentifierTypesDropdownDefaultOptions();
          ClassificationBrowse.checkClassificationIdentifierTypesDropdownOption(
            localClassificationIdentifierType.name,
          );

          // 3 Select any option from expanded multi-select dropdown
          ClassificationBrowse.selectClassificationIdentifierTypesDropdownOption(
            localClassificationIdentifierType.name,
          );
          ClassificationBrowse.checkOptionSelectedInClassificationIdentifierTypesDropdown(1);
        },
      );
    });
  });
});
