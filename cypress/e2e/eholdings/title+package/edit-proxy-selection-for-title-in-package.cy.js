import { Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { EHoldingsResourceView, EHoldingsResourceEdit } from '../../../support/fragments/eholdings';
import EHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      resourcePath: '/resources/38-467-103587',
      titleName: 'Fashion Theory',
      noneProxy: 'Inherited - None',
    };

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uieHoldingsRecordsEdit.gui,
        Permissions.uieHoldingsPackageTitleSelectUnselect.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        EHoldingsTitle.changeResourceSelectionStatusViaApi({
          resourceId: testData.resourcePath.split('/').pop(),
          isSelected: false,
        });

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath + testData.resourcePath,
          waiter: EHoldingsResourceView.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C698 Edit proxy selection for a title in a package (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C698'] },
      () => {
        EHoldingsResourceView.addToHoldings();
        cy.wait(2000);
        EHoldingsResourceView.checkHoldingStatus('Selected');
        EHoldingsResourceView.verifyResourceSettingsAccordion();
        EHoldingsResourceView.verifyProxy();
        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.waitLoading();

        cy.getToken(testData.user.username, testData.user.password);
        EHoldingsResourceEdit.changeProxy().then((newProxy) => {
          testData.firstProxy = newProxy;
          EHoldingsResourceEdit.verifyProxiedURLNotDisplayed();

          EHoldingsResourceEdit.saveAndClose();
          cy.wait(1000);

          EHoldingsResourceView.verifyProxy(testData.firstProxy);
          EHoldingsResourceView.verifyProxiedURL();

          EHoldingsResourceView.verifyProxiedURLLink();
        });

        EHoldingsResourceView.removeTitleFromHolding();
        cy.wait(1000);
        EHoldingsResourceView.checkHoldingStatus('Not selected');
        EHoldingsResourceView.verifyResourceSettingsAccordion();
        EHoldingsResourceView.verifyProxy(testData.noneProxy);
        EHoldingsResourceView.verifyProxiedURLNotDisplayed();
      },
    );
  });
});
