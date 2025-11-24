import { Permissions } from '../../../../support/dictionary';
import { APPLICATION_NAMES } from '../../../../support/constants';
import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ClassificationBrowse, {
  defaultClassificationBrowseNames,
  classificationIdentifierTypesDropdownDefaultOptions,
  defaultClassificationBrowseIdsAlgorithms,
} from '../../../../support/fragments/settings/inventory/instances/classificationBrowse';
import ClassificationIdentifierTypes, {
  identifierTypesSectionName,
} from '../../../../support/fragments/settings/inventory/instances/classificationIdentifierTypes';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InteractorsTools from '../../../../support/utils/interactorsTools';
import AreYouSureModal from '../../../../support/fragments/orders/modals/areYouSureModal';
import { including } from '../../../../../interactors';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';

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
          InteractorsTools.checkCalloutMessage(
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
            cy.login(user.username, user.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
            cy.intercept('browse/config/instance-classification*').as('instanceClassifications');
            ClassificationBrowse.openClassificationBrowse();
            cy.wait('@instanceClassifications');
            ClassificationBrowse.checkClassificationBrowsePaneOpened();
          });
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        ClassificationBrowse.updateIdentifierTypesAPI(
          testData.classificationBrowseId,
          testData.classificationBrowseAlgorithm,
          [],
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

    describe('Classification browse', () => {
      let user;

      const testData = {
        localClassificationIdentifierTypes: [
          {
            name: `C451645 Local type 1 ${getRandomPostfix()}`,
            source: 'local',
          },
          {
            name: `C451645 Local type 2 ${getRandomPostfix()}`,
            source: 'local',
          },
        ],
        classificationBrowseName: defaultClassificationBrowseNames[2],
        classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[2].id,
        classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[2].algorithm,
        classificationIdentifierTypeIds: [],
      };

      const saveCalloutText = `The Classification browse type ${testData.classificationBrowseName} was successfully updated`;

      before('Create user, login', () => {
        cy.createTempUser([
          Permissions.uiInventorySettingsConfigureClassificationBrowse.gui,
          Permissions.crudClassificationIdentifierTypes.gui,
        ]).then((userProperties) => {
          user = userProperties;
          ClassificationIdentifierTypes.createViaApi(
            testData.localClassificationIdentifierTypes[0],
          ).then((response1) => {
            testData.classificationIdentifierTypeIds.push(response1.body.id);
            ClassificationIdentifierTypes.createViaApi(
              testData.localClassificationIdentifierTypes[1],
            ).then((response2) => {
              testData.classificationIdentifierTypeIds.push(response2.body.id);
              // update identifier types for target classification browse
              ClassificationBrowse.getIdentifierTypesForCertainBrowseAPI(
                testData.classificationBrowseId,
              ).then((types) => {
                testData.originalTypes = types;
              });
              ClassificationBrowse.updateIdentifierTypesAPI(
                testData.classificationBrowseId,
                testData.classificationBrowseAlgorithm,
                [...testData.classificationIdentifierTypeIds],
              );
              cy.login(user.username, user.password);
              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
              cy.intercept('browse/config/instance-classification*').as('instanceClassifications');
              ClassificationBrowse.openClassificationBrowse();
              cy.wait('@instanceClassifications');
              ClassificationBrowse.checkClassificationBrowsePaneOpened();
            });
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
        testData.classificationIdentifierTypeIds.forEach((id) => {
          ClassificationIdentifierTypes.deleteViaApi(id);
        });
      });

      it(
        'C451645 Delete already selected “Classification identifier types” when edit "Classification browse" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C451645'] },
        () => {
          ClassificationBrowse.checkClassificationBrowseInTable(
            testData.classificationBrowseName,
            `${testData.localClassificationIdentifierTypes[0].name}${testData.localClassificationIdentifierTypes[1].name}`,
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
          testData.localClassificationIdentifierTypes.forEach((localType) => {
            ClassificationBrowse.selectClassificationIdentifierType(localType.name, false);
          });
          ClassificationBrowse.checkSaveButtonEnabledInBrowseOption(
            testData.classificationBrowseName,
          );
          ClassificationBrowse.clickSaveButtonInBrowseOption(testData.classificationBrowseName);
          cy.wait(1000);
          InteractorsTools.checkCalloutMessage(saveCalloutText);
          ClassificationBrowse.checkClassificationBrowseInTable(
            testData.classificationBrowseName,
            '',
          );
        },
      );
    });

    describe('Classification browse', () => {
      let user;

      const testData = {
        localClassificationIdentifierType: {
          name: `C451643 Local type ${getRandomPostfix()}`,
          source: 'local',
        },
        optionToSelect: classificationIdentifierTypesDropdownDefaultOptions[0],
        classificationBrowseName: defaultClassificationBrowseNames[2],
        classificationBrowseId: defaultClassificationBrowseIdsAlgorithms[2].id,
        classificationBrowseAlgorithm: defaultClassificationBrowseIdsAlgorithms[2].algorithm,
      };

      const saveCalloutText = `The Classification browse type ${testData.classificationBrowseName} was successfully updated`;

      before('Create user, login', () => {
        cy.getAdminToken();
        // remove all identifier types from target classification browse, if any
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
            cy.login(user.username, user.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
            cy.intercept('browse/config/instance-classification*').as('instanceClassifications');
            ClassificationBrowse.openClassificationBrowse();
            cy.wait('@instanceClassifications');
            ClassificationBrowse.checkClassificationBrowsePaneOpened();
          });
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        ClassificationBrowse.updateIdentifierTypesAPI(
          testData.classificationBrowseId,
          testData.classificationBrowseAlgorithm,
          [],
        );
        Users.deleteViaApi(user.userId);
        ClassificationIdentifierTypes.deleteViaApi(testData.classificationIdentifierTypeId);
      });

      it(
        'C451643 Successful saving toast message is displayed after editing and saving "Classification browse" option (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C451643'] },
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
          ClassificationBrowse.selectClassificationIdentifierTypesDropdownOption(
            testData.optionToSelect,
          );
          ClassificationBrowse.checkOptionSelectedInClassificationIdentifierTypesDropdown(
            testData.classificationBrowseName,
            [testData.optionToSelect],
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
            testData.optionToSelect,
          );
        },
      );
    });

    describe('Classification browse', () => {
      let user;

      before('Create user, login', () => {
        cy.createTempUser([
          Permissions.uiInventorySettingsConfigureClassificationBrowse.gui,
          Permissions.crudClassificationIdentifierTypes.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.login(user.username, user.password);
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C451641 View "Settings >> Inventory >> Classification browse" page (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C451641'] },
        () => {
          // 1 Go to "Settings" app >> "Inventory" tab
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
          ClassificationBrowse.checkPositionInNavigationList();

          // 2 Click on the "Classification browse" section
          cy.intercept('browse/config/instance-classification*').as('instanceClassifications');
          ClassificationBrowse.openClassificationBrowse();
          cy.wait('@instanceClassifications').then(() => {
            ClassificationBrowse.checkClassificationBrowsePaneOpened();
            ClassificationBrowse.checkTableHeaders();
            ClassificationBrowse.checkDefaultClassificationBrowseInTable();
            ClassificationBrowse.checkInfoIconExists();

            // 3 Click on the info popover icon next to “Classification identifier types” column
            ClassificationBrowse.clickInfoIcon();
            ClassificationBrowse.checkPopoverMessage();
          });
        },
      );
    });

    describe('Classification browse', () => {
      const browseName = defaultClassificationBrowseNames[0];
      const optionToSelect = 'UDC';
      let user;

      before('Create user, login', () => {
        cy.getAdminToken();
        resetClassificationBrowse();

        cy.createTempUser([
          Permissions.uiInventorySettingsConfigureClassificationBrowse.gui,
          Permissions.crudClassificationIdentifierTypes.gui,
        ]).then((userProperties) => {
          user = userProperties;
          cy.waitForAuthRefresh(() => {
            cy.login(user.username, user.password);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Inventory');
          }, 20_000);
          cy.intercept('browse/config/instance-classification*').as('instanceClassifications');
          ClassificationBrowse.openClassificationBrowse();
          cy.wait('@instanceClassifications');
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C451646 Switch to another pane during editing of "Classification browse" option (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C451646'] },
        () => {
          ClassificationBrowse.clickEditButtonInBrowseOption(browseName);
          ClassificationBrowse.checkCancelButtonEnabledInBrowseOption(browseName);
          ClassificationBrowse.checkSaveButtonEnabledInBrowseOption(browseName, false);

          ClassificationBrowse.expandClassificationIdentifierTypesDropdownInBrowseOption(
            browseName,
          );
          ClassificationBrowse.selectClassificationIdentifierTypesDropdownOption(optionToSelect);
          ClassificationBrowse.checkOptionSelectedInClassificationIdentifierTypesDropdown(
            browseName,
            including(optionToSelect),
          );
          ClassificationBrowse.checkSaveButtonEnabledInBrowseOption(browseName);

          SettingsPane.selectSettingsTab(identifierTypesSectionName);
          AreYouSureModal.verifyAreYouSureForm(true);
          AreYouSureModal.clickKeepEditingButton();
          AreYouSureModal.verifyAreYouSureForm(false);
          ClassificationBrowse.checkOptionSelectedInClassificationIdentifierTypesDropdown(
            browseName,
            including(optionToSelect),
          );

          SettingsPane.selectSettingsTab(identifierTypesSectionName);
          AreYouSureModal.verifyAreYouSureForm(true);
          AreYouSureModal.clickCloseWithoutSavingButton();
          AreYouSureModal.verifyAreYouSureForm(false);
          SettingsPane.checkPaneIsOpened(identifierTypesSectionName);

          ClassificationBrowse.openClassificationBrowse();
          ClassificationBrowse.validateClassificationIdentifierTypesSelectedOptions(
            browseName,
            optionToSelect,
            false,
          );
        },
      );
    });
  });
});
