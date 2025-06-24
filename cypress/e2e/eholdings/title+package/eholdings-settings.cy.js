import { Permissions } from '../../../support/dictionary';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import { getRandomLetters } from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const randomLetters = getRandomLetters(8);
    const testData = {
      label1Value: `Lorem ipsum dolor sit amet consectetur ${randomLetters}`,
      label2Value: `Label: custom ${randomLetters}`,
      resourseUrl: '/eholdings/resources/58-473-185972',
    };

    before('Creating user, data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiSettingseholdingsViewEditCreateDelete.gui,
        Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
      ]).then((userProperties) => {
        testData.userProperties = userProperties;
        cy.getKbsViaAPI().then((kbs) => {
          testData.credentialsId = kbs[0].id;
          cy.getEHoldingsCustomLabelsForKbViaAPI(testData.credentialsId).then((labels) => {
            testData.originalLabels = labels;

            cy.login(testData.userProperties.username, testData.userProperties.password);
          });
        });
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      cy.updateEHoldingsCustomLabelsForKbViaAPI(testData.credentialsId, testData.originalLabels);
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C9236 Settings: Add/Edit a custom label(spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C9236'] },
      () => {
        cy.visit(SettingsMenu.eHoldingsPath).then(() => {
          EHoldingsPackage.updateCustomLabelInSettings(testData.label1Value, 1);
          EHoldingsPackage.updateCustomLabelInSettings(testData.label2Value, 2);
          EHoldingsPackage.setFullTextFinderForLabel(2);

          cy.visit(testData.resourseUrl).then(() => {
            EHoldingsResourceView.verifyCustomLabelValue(testData.label1Value);
            EHoldingsResourceView.verifyCustomLabelValue(testData.label2Value);
          });
        });
      },
    );
  });
});
