import { APPLICATION_NAMES } from '../../../support/constants';
import Funds from '../../../support/fragments/finance/funds/funds';
import NewFund from '../../../support/fragments/finance/funds/newFund';
import { Invoices, NewInvoice } from '../../../support/fragments/invoices';
import NewInvoiceLine from '../../../support/fragments/invoices/newInvoiceLine';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';
import VendorAddress from '../../../support/fragments/invoices/vendorAddress';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import BatchGroups from '../../../support/fragments/settings/invoices/batchGroups';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import FileManager from '../../../support/utils/fileManager';

describe('Invoices', () => {
  describe('Settings (Invoices)', () => {
    const invoice = { ...NewInvoice.defaultUiInvoice };
    const vendorPrimaryAddress = { ...VendorAddress.vendorAddress };
    const invoiceLine = { ...NewInvoiceLine.defaultUiInvoiceLine };
    const fund = { ...NewFund.defaultFund };
    const batchGroup = { ...BatchGroups.getDefaultBatchGroup() };
    const subtotalValue = 100;
    const batchGroupConfiguration = {
      batchGroupId: '',
      format: 'Application/json',
      enableScheduledExport: false,
      weekdays: [],
    };
    const organization = {
      ...NewOrganization.defaultUiOrganizations,
      addresses: [
        {
          addressLine1: '1 Centerpiece Blvd.',
          addressLine2: 'P.O. Box 15550',
          city: 'New Castle',
          stateRegion: 'DE',
          zipCode: '19720-5550',
          country: 'USA',
          isPrimary: true,
          categories: [],
          language: 'English',
        },
      ],
    };

    before(() => {
      cy.getAdminToken();
      Organizations.createOrganizationViaApi(organization).then((response) => {
        organization.id = response;
      });
      invoice.accountingCode = organization.erpCode;
      Object.assign(
        vendorPrimaryAddress,
        organization.addresses.find((address) => address.isPrimary === true),
      );
      invoice.vendorName = organization.name;
      BatchGroups.createBatchGroupViaApi(batchGroup).then((response) => {
        invoice.batchGroup = response.name;
        batchGroupConfiguration.batchGroupId = response.id;
      });
      SettingsInvoices.setConfigurationBatchGroup(batchGroupConfiguration);
      Funds.createFundViaUI(fund).then(() => {
        Funds.addBudget(100);
      });
      invoiceLine.subTotal = -subtotalValue;
    });

    after('Delete storage', () => {
      cy.getAdminToken();
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      Organizations.deleteOrganizationViaApi(organization.id);
    });

    it(
      'C10943 Run batch voucher export manually (thunderjet)',
      { tags: ['smoke', 'thunderjet', 'C10943'] },
      () => {
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVOICES);
        Invoices.createSpecialInvoice(invoice, vendorPrimaryAddress);
        Invoices.createInvoiceLine(invoiceLine);
        Invoices.addFundDistributionToLine(invoiceLine, fund);
        Invoices.approveInvoice();
        Invoices.voucherExport(batchGroup.name);
        FileManager.findDownloadedFilesByMask('*.json');
      },
    );
  });
});
