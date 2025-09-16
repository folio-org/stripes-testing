import permissions from '../../../support/dictionary/permissions';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import EHoldingsNewCustomTitle from '../../../support/fragments/eholdings/eHoldingsNewCustomTitle';

describe('eHoldings', () => {
  describe('Titles', () => {
    const testData = {
      titleName: 'C423477 Test Custom Title',
    };

    before('Creating user, logging in', () => {
      cy.createTempUser([permissions.uieHoldingsTitlesPackagesCreateDelete.gui]).then(
        (userProperties) => {
          testData.userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
          cy.waitForAuthRefresh(() => {
            cy.reload();
            EHoldingsTitlesSearch.waitLoading();
          });
        },
      );
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
    });

    it(
      'C423477 Cancel changes made in not saved custom "Title" record using "Cancel" button (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423477'] },
      () => {
        EHoldingSearch.switchToTitles();
        EHoldingsTitlesSearch.waitLoading();

        EHoldingsNewCustomTitle.createNewTitle();
        EHoldingsNewCustomTitle.waitLoading();

        EHoldingsPackage.verifyButtonsDisabled();
        EHoldingsNewCustomTitle.fillInThePackageName(testData.titleName);
        EHoldingsPackage.verifyButtonsEnabled();

        EHoldingsPackage.cancelChanges();
        EHoldingsPackage.verifyUnsavedChangesModalExists();
        EHoldingsPackage.clickKeepEditing();

        EHoldingsNewCustomTitle.verifyNameFieldValue(testData.titleName);
        EHoldingsPackage.verifyButtonsEnabled();
        EHoldingsPackage.cancelChanges();

        EHoldingsPackage.verifyUnsavedChangesModalExists();
        EHoldingsPackage.clickContinueWithoutSaving();
        EHoldingsTitlesSearch.waitLoading();
      },
    );
  });
});
