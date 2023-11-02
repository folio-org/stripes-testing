import uuid from 'uuid';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import EHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import Parallelization from '../../../support/dictionary/parallelization';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation('TestSP_1', uuid()),
      label1Value: 'Lorem ipsum dolor sit amet consectetur adipiscing elit et',
      label2Value: 'Label: custom',
      resourseUrl: '/eholdings/resources/58-473-185972',
    };

    before('Creating user, data', () => {
      cy.createTempUser([
        Permissions.uiSettingseholdingsViewEditCreateDelete.gui,
        Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
      ]).then((userProperties) => {
        testData.userProperties = userProperties;
        ServicePoints.createViaApi(testData.servicePoint);
        UserEdit.addServicePointsViaApi(
          [testData.servicePoint.id],
          testData.userProperties.userId,
          testData.servicePoint.id,
        );
        cy.getEHoldingsCustomLabelsViaAPI().then((labels) => {
          testData.label1OriginalValue = labels[0].attributes.displayLabel;
          testData.label2OriginalValue = labels[1].attributes.displayLabel;
        });
        cy.login(testData.userProperties.username, testData.userProperties.password);
      });
    });

    after('Deleting user, data', () => {
      cy.visit(SettingsMenu.eHoldingsPath).then(() => {
        EHoldingsPackage.updateCustomLabelInSettings(testData.label1OriginalValue, 1);
        EHoldingsPackage.updateCustomLabelInSettings(testData.label2OriginalValue, 2);
        EHoldingsPackage.setFullTextFinderForLabel(2);
      });
      UserEdit.changeServicePointPreferenceViaApi(testData.userProperties.userId, [
        testData.servicePoint.id,
      ]);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      Users.deleteViaApi(testData.userProperties.userId);
    });

    it(
      'C9236 Settings: Add/Edit a custom label(spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
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
