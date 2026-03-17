import { Permissions } from '../../../support/dictionary';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';
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
      defaultAgreementForAPI: { ...Agreements.defaultAgreement },
    };

    before('Creating usera and creating data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.uiAgreementsAgreementsEdit.gui,
        Permissions.uiAgreementsAgreementsDelete.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
        Permissions.uiAgreementsSearch.gui,
      ])
        .then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
        })
        .then(() => {
          cy.getAdminToken();
          EHoldingsPackages.createPackageViaAPI().then((response) => {
            testData.packegeId = response.id;
          });
        })
        .then(() => {
          cy.getAdminToken();
          Agreements.createViaApi().then((response) => {
            testData.agreementId = response.id;
          });
        })
        .then(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
        });
    });

    after('Deleting user and data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      EHoldingsPackages.deletePackageViaAPI(testData.defaultPackage.data.attributes.name);
      Agreements.deleteViaApi(testData.agreementId);
    });

    it(
      'C751 Attach a package to an existing Agreement (spitfire)',
      { tags: ['criticalPathBroken', 'spitfire', 'C751'] },
      () => {
        EHoldingSearch.switchToPackages();
        // wait until package is created via API
        cy.wait(15000);
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
        AgreementViewDetails.deletionOfAgreementLine({ openAccordion: false });
      },
    );
  });
});
