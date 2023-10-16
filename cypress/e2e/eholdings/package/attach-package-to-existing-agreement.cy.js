import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import TopMenu from '../../../support/fragments/topMenu';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import Users from '../../../support/fragments/users/users';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      defaultPackage: { ...EHoldingsPackages.getdefaultPackage() },
      defaultAgreementForAPI: { ...Agreements.defaultAgreement },
    };

    before('Creating usera and creating data', () => {
      cy.createTempUser([
        Permissions.uiAgreementsAgreementsEdit.gui,
        Permissions.uiAgreementsSearchAndView,
        Permissions.uieHoldingsRecordsEdit.gui,
        Permissions.uiAgreementsSearch,
      ])
        .then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
        })
        .then(() => {
          EHoldingsPackages.createPackageViaAPI().then((response) => {
            testData.packegeId = response.id;
          });
        })
        .then(() => {
          Agreements.createViaApi().then((response) => {
            testData.agreementId = response.id;
          });
        });
    });

    after('Deleting user and data', () => {
      Users.deleteViaApi(testData.userProperties.userId);
      EHoldingsPackages.deletePackageViaAPI(testData.defaultPackage.data.attributes.name);
      Agreements.deleteViaApi(testData.agreementId);
    });

    it(
      'C751 Attach a package to an existing Agreement (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
      () => {
        EHoldingSearch.switchToPackages();
        // wait until package is created via API
        cy.wait(10000);
        EHoldingsPackagesSearch.byName(testData.defaultPackage.data.attributes.name);
        EHoldingsPackages.verifyPackageInResults(testData.defaultPackage.data.attributes.name);
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.addExistingAgreement();
        EHoldingsPackageView.searchForExistingAgreement(testData.defaultAgreementForAPI.name);
        EHoldingsPackageView.clickOnFoundAgreementInModal(testData.defaultAgreementForAPI.name);
        EHoldingsPackageView.verifyLinkedAgreement(testData.defaultAgreementForAPI.name);
        EHoldingsPackageView.clickOnAgreementInAgreementSection(
          testData.defaultAgreementForAPI.name,
        );
        AgreementViewDetails.verifyAgreementDetailsIsDisplayedByTitle(
          testData.defaultAgreementForAPI.name,
        );
        AgreementViewDetails.openAgreementLinesSection();
        AgreementViewDetails.verifyAgreementLinePresented(
          testData.defaultPackage.data.attributes.name,
        );
        AgreementViewDetails.deletionOfAgreementLine();
      },
    );
  });
});
