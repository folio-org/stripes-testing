import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import Users from '../../../support/fragments/users/users';
import NewAgreement from '../../../support/fragments/agreements/newAgreement';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';

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
      Users.deleteViaApi(testData.userId);
      EHoldingsPackages.deletePackageViaAPI(testData.defaultPackage.data.attributes.name);
    });

    it(
      'C1295 Create a new Agreement and attach a package (spitfire)',
      { tags: [TestTypes.extendedPath, DevTeams.spitfire] },
      () => {
        EHoldingSearch.switchToPackages();
        cy.wait(8000);
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
