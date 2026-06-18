import TopMenu from '../../../support/fragments/topMenu';
import Organizations from '../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Agreements from '../../../support/fragments/agreements/agreements';
import { APPLICATION_NAMES } from '../../../support/constants';
import SearchAgreements from '../../../support/fragments/agreements/searchAndFilterAgreements';
import EditAgreement from '../../../support/fragments/agreements/editAgreement';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import AgreementViewDetails from '../../../support/fragments/agreements/agreementViewDetails';

describe('fse-organizations - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.organizationsPath,
      waiter: Organizations.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195376 - verify that organizations page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'organizations', 'TC195376'] },
    () => {
      Organizations.waitLoading();
    },
  );
});

describe('fse-organizations - UI (data manipulation)', () => {
  let agreementId;
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const defaultInterface = { ...NewOrganization.defaultInterface };
  const defaultAgreement = { ...Agreements.defaultAgreement };

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.organizationsPath,
      waiter: Organizations.waitLoading,
    });
    cy.allure().logCommandSteps();
  });

  afterEach(() => {
    cy.allure().logCommandSteps(false);
    cy.getAdminToken();
    cy.allure().logCommandSteps();
    Organizations.getOrganizationViaApi({ query: `name="${organization.name}"` }).then(
      (returnedOrganization) => {
        Organizations.deleteOrganizationViaApi(returnedOrganization.id);
      },
    );
  });

  it(
    `TC195623 - create organization and assign interfase for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['nonProd', 'fse', 'ui', 'organizations', 'fse-user-journey', 'TC195623'] },
    () => {
      // create new organization via UI
      Organizations.createOrganizationViaUi(organization);
      Organizations.checkOrganizationInfo(organization);
      // assign an interface
      Organizations.editOrganization();
      Organizations.addNewInterface(defaultInterface);
      Organizations.closeInterface();
      Organizations.addIntrefaceToOrganization(defaultInterface);
      Organizations.checkInterfaceIsAdd(defaultInterface);
      Organizations.editOrganization();
      Organizations.selectInterface(defaultInterface);
      Organizations.deleteInterface();
    },
  );

  before('Creating data', () => {
    cy.allure().logCommandSteps(false);
    cy.getAdminToken();
    defaultAgreement.name += 'FSE_TEST_TC195673';
    Agreements.createViaApi(defaultAgreement).then((agreement) => {
      agreementId = agreement.id;
    });
    cy.allure().logCommandSteps();
  });

  after('Delete test data', () => {
    cy.allure().logCommandSteps(false);
    cy.getAdminToken();
    Agreements.deleteViaApi(agreementId);
    cy.allure().logCommandSteps();
  });

  it(
    `TC195673 - create organization, add organization to agreement for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['nonProd', 'fse', 'ui', 'organizations', 'fse-user-journey', 'TC195673'] },
    () => {
      // create new organization via UI
      organization.name += 'FSE_TEST_TC195673';
      Organizations.createOrganizationViaUi(organization);
      Organizations.checkOrganizationInfo(organization);
      // add organization to an agreement
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.AGREEMENTS);
      Agreements.waitLoading();
      SearchAgreements.search(defaultAgreement.name);
      Agreements.selectRecord(defaultAgreement.name);
      cy.wait(1000);
      Agreements.editAgreement();
      EditAgreement.waitLoading();
      cy.wait(1000);
      EditAgreement.addOrganization(organization.name, 'Content Provider');
      EditAgreement.waitLoading();
      EditAgreement.saveAndClose();
      // verify organizations added
      AgreementViewDetails.verifyOrganizationsAccordion(true);
      AgreementViewDetails.verifyOrganizationsCount('1');
    },
  );
});
