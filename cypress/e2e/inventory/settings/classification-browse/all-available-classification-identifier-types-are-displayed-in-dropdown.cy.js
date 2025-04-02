import { Permissions } from '../../../../support/dictionary';
import { APPLICATION_NAMES } from '../../../../support/constants';
import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ClassificationBrowse from '../../../../support/fragments/settings/inventory/instances/classificationBrowse';
import ClassificationIdentifierTypes from '../../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import getRandomPostfix from '../../../../support/utils/stringTools';
import interactorsTools from '../../../../support/utils/interactorsTools';

const resetClassificationBrowse = () => {
  // Reset the classification browse settings to default values
  [
    { id: 'all', shelvingAlgorithm: 'default' },
    { id: 'dewey', shelvingAlgorithm: 'dewey' },
    { id: 'lc', shelvingAlgorithm: 'lc' },
  ].forEach(({ id, shelvingAlgorithm }) => {
    ClassificationBrowse.updateIdentifierTypesAPI(id, shelvingAlgorithm, []);
  });
};

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Classification browse', () => {
      const localClassificationIdentifierTypes = Array(5)
        .fill({})
        .map((_, idx) => {
          return {
            name: `AT_C451642 Classification identifier type ${idx} ${getRandomPostfix()}`,
            source: 'local',
          };
        });

      const defaultClassificationBrowseNames = [
        'Classification (all)',
        'Dewey Decimal classification',
        'Library of Congress classification',
      ];
      const optionToSelect = 'Additional Dewey';
      let user;
      let classificationIdentifierTypesAll;

      before('Create user, login', () => {
        cy.getAdminToken();
        localClassificationIdentifierTypes.forEach((classificationIdentifierType) => {
          ClassificationIdentifierTypes.createViaApi(classificationIdentifierType);
        });
        cy.createTempUser([
          Permissions.uiInventorySettingsConfigureClassificationBrowse.gui,
          Permissions.crudClassificationIdentifierTypes.gui,
        ]).then((userProperties) => {
          user = userProperties;
          ClassificationIdentifierTypes.getViaApi()
            .then((classificationIdentifierTypes) => {
              classificationIdentifierTypesAll = classificationIdentifierTypes;
            })
            .then(() => {
              resetClassificationBrowse();
            });
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
        ClassificationIdentifierTypes.deleteViaApiByName('C451642');
      });

      it(
        `C451642 All available "Classification identifier types" are displayed in "Classification identifier types" 
            multi-select dropdown element of each "Classification browse" option on "Classification browse" pane. (spitfire)`,
        { tags: ['criticalPath', 'spitfire', 'C451642'] },
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
              localClassificationIdentifierTypes[0].name,
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

          // Select all options from the multi-select dropdown and save changes
          const classificationBrowseName = defaultClassificationBrowseNames[0];
          ClassificationBrowse.clickEditButtonInBrowseOption(classificationBrowseName);

          ClassificationBrowse.expandClassificationIdentifierTypesDropdownInBrowseOption(
            classificationBrowseName,
          );

          ClassificationBrowse.selectClassificationIdentifierTypesDropdownOptions(
            classificationIdentifierTypesAll.map((_) => _.name),
          );
          ClassificationBrowse.clickSaveButtonInBrowseOption(classificationBrowseName);
          interactorsTools.checkCalloutMessage(
            `The Classification browse type ${classificationBrowseName} was successfully updated`,
          );

          // Check that the selected options are displayed as saved in the "Classification identifier types" column of the browse option
          classificationIdentifierTypesAll.forEach((classificationIdentifierType) => {
            ClassificationBrowse.validateClassificationIdentifierTypesSelectedOptions(
              classificationBrowseName,
              classificationIdentifierType.name,
            );
          });
        },
      );
    });
  });
});
