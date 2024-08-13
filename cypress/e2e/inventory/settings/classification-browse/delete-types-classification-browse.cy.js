import { Permissions } from '../../../../support/dictionary';
import { APPLICATION_NAMES } from '../../../../support/constants';
import Users from '../../../../support/fragments/users/users';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ClassificationBrowse, {
  defaultClassificationBrowseNames,
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
        { tags: ['criticalPath', 'spitfire'] },
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
  });
});
