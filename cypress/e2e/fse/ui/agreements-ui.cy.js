import TopMenu from '../../../support/fragments/topMenu';
import SearchAgreements from '../../../support/fragments/agreements/searchAndFilterAgreements';
import NewAgreement from '../../../support/fragments/agreements/newAgreement';
import NewLicense from '../../../support/fragments/licenses/newLicense';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';
import Agreements from '../../../support/fragments/agreements/agreements';
import EditAgreement from '../../../support/fragments/agreements/editAgreement';
import Licenses from '../../../support/fragments/licenses/licenses';
import { APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';

describe('fse-agreements - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.agreementsPath,
      waiter: SearchAgreements.verifyAgreementsFilterPane,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195280 - verify that agreements module is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'agreements', 'TC195280'] },
    () => {
      SearchAgreements.verifyAgreementsFilterPane();
      Agreements.checkSwitchToLocalKbDisplayed();
    },
  );
});

describe('fse-agreements - UI (data manipulation)', () => {
  const defaultAgreement = { ...NewAgreement.getdefaultAgreement() };
  const defaultLicense = { ...NewLicense.defaultLicense };

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.agreementsPath,
      waiter: Agreements.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  after('delete test data', () => {
    cy.getIdByName(defaultLicense.name).then((response) => {
      cy.deleteLicenseById(response.body.results[0].id).then(() => {
        Agreements.getIdViaApi({ limit: 1000, query: `"name"=="${defaultAgreement.name}"` }).then(
          (id) => {
            Agreements.deleteViaApi(id);
          },
        );
      });
    });
  });

  it(
    `TC195629 - create new agreement, create new license - assign and delete ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['nonProd', 'fse', 'ui', 'agreements', 'fse-user-journey', 'TC195629'] },
    () => {
      defaultAgreement.name += 'FSE_TEST_TC195629';
      defaultLicense.name += 'FSE_TEST_TC195629';
      // create agreement
      Agreements.createAndCheckFields(defaultAgreement);
      Agreements.checkAgreementPresented(defaultAgreement.name);
      AgreementViewDetails.verifyAgreementDetails(defaultAgreement);
      AgreementViewDetails.verifyLastUpdatedDate();
      // create new license
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.LICENSES);
      Licenses.waitLoading();
      Licenses.createNewLicense(defaultLicense);
      Licenses.checkLicensePresented(defaultLicense);
      // assign license to agreement
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.AGREEMENTS);
      Agreements.waitLoading();
      SearchAgreements.search(defaultAgreement.name);
      Agreements.selectRecord(defaultAgreement.name);
      Agreements.editAgreement();
      EditAgreement.waitLoading();
      EditAgreement.linkLicense(defaultLicense.name, 'Controlling');
      Agreements.waitLoading();
      Agreements.checkControllingLicenseDisplayed();
      // delete license
      Agreements.editAgreement();
      EditAgreement.waitLoading();
      EditAgreement.deleteLicense();
      Agreements.waitLoading();
    },
  );
});
