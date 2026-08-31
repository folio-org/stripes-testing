import { Permissions } from '../../../support/dictionary';
import { EHoldingsResourceEdit, EHoldingsResourceView } from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      resourcePath: '/resources/58251-22551-1767035',
      resourceId: '58251-22551-1767035',
      labelAValue: `Test value ${getRandomPostfix()}`,
    };

    before('Create user and get custom labels', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
        testData.user = userProperties;
      });

      cy.getEHoldingsCustomLabelsViaAPI().then((labels) => {
        testData.labelA = labels[0].attributes.displayLabel;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath + testData.resourcePath,
          waiter: EHoldingsResourceView.waitLoading,
        });

        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.waitLoading();
        EHoldingsResourceEdit.fillCustomLabelValue(testData.labelA, testData.labelAValue);
        EHoldingsResourceEdit.saveAndClose();
        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyCustomLabelValue(testData.labelA, testData.labelAValue);
      });
    });

    after('Delete user and restore custom label value', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C9241 Selected Title+Package: Remove a value from a custom label (promin)',
      { tags: ['extendedPath', 'promin', 'C9241'] },
      () => {
        EHoldingsResourceView.verifyCustomLabelValue(testData.labelA, testData.labelAValue);
        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.waitLoading();

        EHoldingsResourceEdit.fillCustomLabelValue(testData.labelA, '');
        EHoldingsResourceEdit.saveAndClose();

        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyCustomLabelValue(testData.labelA);
      },
    );
  });
});
