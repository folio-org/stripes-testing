import { Permissions } from '../../../../support/dictionary';
import { APPLICATION_NAMES } from '../../../../support/constants';
import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ClassificationBrowse, {
  defaultClassificationBrowseNames,
  classificationIdentifierTypesDropdownDefaultOptions,
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../../support/fragments/settings/inventory/instances/classificationBrowse';
import ClassificationIdentifierTypes from '../../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Classification browse', () => {
      let user;

      const testData = {
        localClassificationIdentifierType: {
          name: `C451644 Local type ${getRandomPostfix()}`,
          source: 'local',
        },
        classificationBrowseName: defaultClassificationBrowseNames[2],
        classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[2].id,
        classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[2].algorithm,
      };

      const saveCalloutText = `The Classification browse type ${testData.classificationBrowseName} was successfully updated`;

      before('Create user, login', () => {
        cy.getAdminToken();
        // remove all identifier types from target classification browse, if any
        ClassificationBrowse.getIdentifierTypesForCertainBrowseAPI(
          testData.classificationBrowseId,
        ).then((types) => {
          testData.originalTypes = types;
        });
        ClassificationBrowse.updateIdentifierTypesAPI(
          testData.classificationBrowseId,
          testData.classificationBrowseAlgorithm,
          [],
        );
        cy.createTempUser([
          Permissions.uiInventorySettingsConfigureClassificationBrowse.gui,
          Permissions.crudClassificationIdentifierTypes.gui,
        ]).then((userProperties) => {
          user = userProperties;
          ClassificationIdentifierTypes.createViaApi(
            testData.localClassificationIdentifierType,
          ).then((response) => {
            testData.classificationIdentifierTypeId = response.body.id;
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
            });
            cy.intercept('browse/config/instance-classification*').as('instanceClassifications');
            ClassificationBrowse.openClassificationBrowse();
            cy.wait('@instanceClassifications');
            ClassificationBrowse.checkClassificationBrowsePaneOpened();
          });
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        // restore the original identifier types for target classification browse
        ClassificationBrowse.updateIdentifierTypesAPI(
          testData.classificationBrowseId,
          testData.classificationBrowseAlgorithm,
          testData.originalTypes,
        );
        Users.deleteViaApi(user.userId);
        ClassificationIdentifierTypes.deleteViaApi(testData.classificationIdentifierTypeId);
      });

      it(
        'C451644 Select all available “Classification identifier types” when edit "Classification browse" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C451644'] },
        () => {
          ClassificationBrowse.checkClassificationBrowseInTable(
            testData.classificationBrowseName,
            '',
          );
          ClassificationBrowse.clickEditButtonInBrowseOption(testData.classificationBrowseName);
          ClassificationBrowse.checkClassificationIdentifierTypesExistsInBrowseoption(
            testData.classificationBrowseName,
          );
          ClassificationBrowse.checkCancelButtonEnabledInBrowseOption(
            testData.classificationBrowseName,
          );
          ClassificationBrowse.checkSaveButtonEnabledInBrowseOption(
            testData.classificationBrowseName,
            false,
          );
          ClassificationBrowse.expandClassificationIdentifierTypesDropdownInBrowseOption(
            testData.classificationBrowseName,
          );
          ClassificationBrowse.checkClassificationIdentifierTypesDropdownDefaultOptions();
          ClassificationBrowse.checkClassificationIdentifierTypesDropdownOption(
            testData.localClassificationIdentifierType.name,
          );
          classificationIdentifierTypesDropdownDefaultOptions.forEach((defaultType) => {
            ClassificationBrowse.selectClassificationIdentifierTypesDropdownOption(defaultType);
          });
          ClassificationBrowse.selectClassificationIdentifierTypesDropdownOption(
            testData.localClassificationIdentifierType.name,
          );
          ClassificationBrowse.checkOptionSelectedInClassificationIdentifierTypesDropdown(
            testData.classificationBrowseName,
            [
              ...classificationIdentifierTypesDropdownDefaultOptions,
              testData.localClassificationIdentifierType.name,
            ],
          );
          ClassificationBrowse.checkClassificationIdentifierTypesDropdownExpanded(
            testData.classificationBrowseName,
          );
          ClassificationBrowse.checkSaveButtonEnabledInBrowseOption(
            testData.classificationBrowseName,
          );
          ClassificationBrowse.clickSaveButtonInBrowseOption(testData.classificationBrowseName);
          cy.wait(1000);
          InteractorsTools.checkCalloutMessage(saveCalloutText);
          ClassificationBrowse.checkClassificationBrowseInTable(
            testData.classificationBrowseName,
            [
              ...classificationIdentifierTypesDropdownDefaultOptions,
              testData.localClassificationIdentifierType.name,
            ].join(''),
          );
        },
      );
    });
  });
});
