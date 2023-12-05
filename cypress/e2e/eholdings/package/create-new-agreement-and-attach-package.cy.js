import { Permissions } from '../../../support/dictionary';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import NewAgreement from '../../../support/fragments/agreements/newAgreement';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      defaultPackage: { ...EHoldingsPackages.getdefaultPackage() },
      defaultAgreement: { ...NewAgreement.getdefaultAgreement() },
    };

    before('Creating user, logging in', () => {
      cy.createTempUser([
        Permissions.uiAgreementsAgreementsEdit.gui,
        Permissions.uiAgreementsSearchAndView,
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiAgreementsSearch,
      ]).then((userProperties) => {
        testData.userId = userProperties.userId;

        EHoldingsPackages.createPackageViaAPI().then((response) => {
          testData.packegeId = response.id;
        });
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      EHoldingsPackages.deletePackageViaAPI(testData.defaultPackage.data.attributes.name);
    });

    it(
      'C1295 Create a new Agreement and attach a package (spitfire)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        EHoldingSearch.switchToPackages();
        cy.wait(10000);
        EHoldingsPackagesSearch.byName(testData.defaultPackage.data.attributes.name);
        EHoldingsPackages.verifyPackageInResults(testData.defaultPackage.data.attributes.name);
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.createNewAgreement();
        NewAgreement.waitLoading();
        NewAgreement.fill(testData.defaultAgreement);
        NewAgreement.save();
        AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
          testData.defaultAgreement.name,
        );
        AgreementViewDetails.openAgreementLinesSection();
        AgreementViewDetails.verifyAgreementLinePresented(
          testData.defaultPackage.data.attributes.name,
        );
        cy.visit(TopMenu.eholdingsPath);
        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.defaultPackage.data.attributes.name);
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyLinkedAgreement(testData.defaultAgreement.name);
        EHoldingsPackageView.close();
        EHoldingsPackages.verifyDetailsPaneAbsent(testData.defaultPackage.data.attributes.name);
        EHoldingsPackages.verifyPackageInResults(testData.defaultPackage.data.attributes.name);
      },
    );
  });
});
