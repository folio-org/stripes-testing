import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import Agreements from '../../../support/fragments/agreements/agreements';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      searchQuery: 'Wiley',
    };

    before('Create user, agreement & link to package as admin', () => {
      cy.getAdminToken();
      cy.createTempUser([
        permissions.uieHoldingsRecordsEdit.gui,
        permissions.uiAgreementsSearchAndView.gui,
        permissions.uiAgreementsAgreementsEdit.gui,
        permissions.uiAgreementsSearch.gui,
      ])
        .then((user) => {
          testData.user = user;
        })
        .then(() => {
          cy.getAdminToken();
          Agreements.createViaApi().then((response) => {
            testData.agreementId = response.id;
            testData.agreementName = response.name;
          });
        })
        .then(() => {
          cy.loginAsAdmin({
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsPackages.waitLoading,
          });
          EHoldingsSearch.switchToPackages();

          EHoldingsPackagesSearch.byName(testData.searchQuery);
          EHoldingsPackages.openPackage();
          EHoldingsPackageView.waitLoading();

          EHoldingsPackageView.addExistingAgreement();
          EHoldingsPackageView.searchForExistingAgreement(testData.agreementName);
          EHoldingsPackageView.clickOnFoundAgreementInModal(testData.agreementName);
          EHoldingsPackageView.verifyLinkedAgreement(testData.agreementName);
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsPackages.waitLoading,
          });
          EHoldingsSearch.switchToPackages();
        });
    });

    after('Delete user and agreement', () => {
      cy.getAdminToken();
      Agreements.deleteViaApi(testData.agreementId);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C471493 Remove an Agreement from Package record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C471493'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.searchQuery);
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyLinkedAgreement(testData.agreementName);
        EHoldingsPackageView.verifyDeleteAgreementIconExists(testData.agreementName);

        EHoldingsPackageView.verifyLinkedAgreement(testData.agreementName);

        EHoldingsPackageView.clickDeleteAgreementIcon(testData.agreementName);
        EHoldingsPackageView.verifyDeleteAgreementModal(testData.agreementName);
        EHoldingsPackageView.confirmDeleteAgreement();

        EHoldingsPackageView.verifyAgreementNotLinked(testData.agreementName);
      },
    );
  });
});
