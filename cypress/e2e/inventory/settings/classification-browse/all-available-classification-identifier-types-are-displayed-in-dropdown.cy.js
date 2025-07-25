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
        source: 'local',
      };
      const defaultClassificationBrowseNames = [
        'Classification (all)',
        'Dewey Decimal classification',
        'Library of Congress classification',
      ];
      const optionToSelect = 'Additional Dewey';
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
        `C709261 All available "Classification identifier types" are displayed in "Classification identifier types" 
            multi-select dropdown element of each "Classification browse" option on "Classification browse" pane (spitfire)`,
        { tags: ['criticalPath', 'spitfire', 'C709261'] },
        () => {
          defaultClassificationBrowseNames.forEach((classificationBrowseName) => {
            // Click on the "Edit" (pencil) icon next to the browse option
            ClassificationBrowse.clickEditButtonInBrowseOption(classificationBrowseName);
            ClassificationBrowse.checkClassificationIdentifierTypesExistsInBrowseoption(
              classificationBrowseName,
            );
            ClassificationBrowse.checkCancelButtonEnabledInBrowseOption(classificationBrowseName);
            ClassificationBrowse.checkSaveButtonEnabledInBrowseOption(
              classificationBrowseName,
              false,
            );

            // Click on the multi-select dropdown element displayed in the "Classification identifier types" column of the browse option
            ClassificationBrowse.expandClassificationIdentifierTypesDropdownInBrowseOption(
              classificationBrowseName,
            );
            ClassificationBrowse.checkClassificationIdentifierTypesDropdownDefaultOptions();
            ClassificationBrowse.checkClassificationIdentifierTypesDropdownOption(
              localClassificationIdentifierType.name,
            );

            // Select any option from expanded multi-select dropdown
            ClassificationBrowse.selectClassificationIdentifierTypesDropdownOption(optionToSelect);
            ClassificationBrowse.checkOptionSelectedInClassificationIdentifierTypesDropdown(
              classificationBrowseName,
              [optionToSelect],
            );
            ClassificationBrowse.checkClassificationIdentifierTypesDropdownExpanded(
              classificationBrowseName,
            );
            ClassificationBrowse.checkSaveButtonEnabledInBrowseOption(classificationBrowseName);

            // Click on the "Cancel" button
            ClassificationBrowse.clickCancelButtonInBrowseOption(classificationBrowseName);
            cy.wait(1000);
            ClassificationBrowse.checkClassificationBrowseInTable(classificationBrowseName, '');
          });
        },
      );
    });
  });
});
