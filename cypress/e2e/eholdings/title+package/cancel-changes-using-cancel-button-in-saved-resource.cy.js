import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { FILTER_STATUSES } from '../../../support/fragments/eholdings/eholdingsConstants';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import EHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';
import EHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';
import EHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import EHoldingsResourceEdit from '../../../support/fragments/eholdings/eHoldingsResourceEdit';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import { EHoldingsProviderEdit } from '../../../support/fragments/eholdings';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      existingTitle: 'Wiley',
    };

    before('Create user & login', () => {
      cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui]).then((user) => {
        testData.user = user;
        cy.login(user.username, user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
        EHoldingsSearch.switchToTitles();
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C423466 Cancel changes made in saved Title+Package via Cancel button (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C423466'] },
      () => {
        EHoldingsTitle.searchTitle(testData.existingTitle);
        EHoldingsTitles.openTitle(0);
        EHoldingsTitle.waitPackagesLoading();
        EHoldingsTitle.filterPackages(FILTER_STATUSES.SELECTED);
        EHoldingsTitle.waitPackagesLoading();

        EHoldingsTitle.openResource();
        EHoldingsResourceView.waitLoading();

        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.waitLoading();
        EHoldingsPackage.verifyButtonsDisabled();

        EHoldingsProviderEdit.changeProxy();
        EHoldingsPackage.verifyButtonsEnabled();

        EHoldingsPackage.cancelChanges();
        EHoldingsPackage.verifyUnsavedChangesModalExists();

        EHoldingsPackage.clickKeepEditing();
        EHoldingsPackage.verifyUnsavedChangesModalNotExists();
        EHoldingsPackage.verifyButtonsEnabled();

        EHoldingsPackage.cancelChanges();
        EHoldingsPackage.verifyUnsavedChangesModalExists();

        EHoldingsPackage.clickContinueWithoutSaving();
        EHoldingsResourceView.waitLoading();

        EHoldingsResourceView.closeHoldingsResourceView();

        EHoldingsTitle.closeHoldingsTitleView();
        EHoldingsTitlesSearch.waitLoading();
      },
    );
  });
});
