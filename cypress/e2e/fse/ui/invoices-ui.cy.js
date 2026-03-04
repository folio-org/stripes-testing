import TopMenu from '../../../support/fragments/topMenu';
import Invoices from '../../../support/fragments/invoices/invoices';
import NewInvoice from '../../../support/fragments/invoices/newInvoice';
import { APPLICATION_NAMES } from '../../../support/constants';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import { Localization } from '../../../support/fragments/settings/tenant/general';
import Modals from '../../../support/fragments/modals';

describe('fse-invoices - UI (data manipulation)', () => {
  const invoice = { ...NewInvoice.defaultUiInvoice };

  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: TopMenu.invoicesPath,
      waiter: Invoices.waitLoading,
    });
    cy.getUserToken(Cypress.env('diku_login'), Cypress.env('diku_password'));
    // get any active organization in order to create invoice
    cy.getOrganizationsByStatus('Active').then((response) => {
      invoice.accountingCode = response.body.organizations[0].erpCode || 'No value set-';
      invoice.vendorName = response.body.organizations[0].name;
    });
    cy.getBatchGroups().then((batchGroup) => {
      invoice.batchGroup = batchGroup.name;
    });
    cy.allure().logCommandSteps();
  });

  it(
    `TC195468 - create invoice for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['nonProd', 'fse', 'ui', 'invoice', 'fse-user-journey', 'TC195468'] },
    () => {
      Invoices.createDefaultInvoiceWithoutAddress(invoice);
      Invoices.checkCreatedInvoice(invoice);
      Invoices.deleteInvoiceViaActions();
      Invoices.confirmInvoiceDeletion();
    },
  );
});

describe('fse-invoices - UI (no data manipulation)', () => {
  beforeEach(() => {
    // hide sensitive data from the report
    cy.allure().logCommandSteps(false);
    cy.loginAsAdmin({
      path: SettingsMenu.sessionLocalePath,
      waiter: Localization.americanEnglishButtonWaitLoading,
    });
    cy.allure().logCommandSteps();
    // close service point modal if it appears after login
    Modals.closeModalWithEscapeIfAny();
    // change session locale to English (temporary action, won't affect tenant settings)
    Localization.selectAmericanEnglish();
    // close service point modal if it appears after switching locale
    Modals.closeModalWithEscapeIfAny();
  });

  it(
    `TC195320 - verify that invoices page is displayed for ${Cypress.env('OKAPI_HOST')}`,
    { tags: ['sanity', 'fse', 'ui', 'invoice', 'TC195320'] },
    () => {
      TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
    },
  );
});
