import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import DateTools from '../../support/utils/dateTools';
import Invoices from '../../support/fragments/invoices/invoices';
import { INVOICE_BATCH_GROUPS } from '../../support/constants/invoices/invoice';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const testData = {
    acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit(),
    organization: NewOrganization.getDefaultOrganization(),
    invoice: {
      ...Invoices.getDefaultInvoice({ batchGroupName: INVOICE_BATCH_GROUPS.FOLIO }),
      invoiceDate: DateTools.getCurrentDate(),
    },
    user: {},
    membershipId: null,
  };

  before(() => {
    cy.getAdminToken().then(() => {
      AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then(() => {
        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          cy.createTempUser([
            Permissions.viewEditCreateInvoiceInvoiceLine.gui,
            Permissions.assignAcqUnitsToNewInvoice.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            AcquisitionUnits.assignUserViaApi(userProperties.userId, testData.acqUnit.id).then(
              (membershipId) => {
                testData.membershipId = membershipId;

                cy.login(userProperties.username, userProperties.password, {
                  path: TopMenu.invoicesPath,
                  waiter: Invoices.waitLoading,
                });
              },
            );
          });
        });
      });
    });
  });

  after(() => {
    cy.getAdminToken().then(() => {
      AcquisitionUnits.unAssignUserViaApi(testData.membershipId);
      AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acqUnit.id);
      Invoices.deleteInvoiceViaApi(testData.invoice.id, { failOnStatusCode: false });
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C196777 Invoice: Assign acquisitions units to new record (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C196777'] },
    () => {
      // Create a new invoice with acquisition unit
      Invoices.openNewInvoiceForm();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.fillInvoiceFields({
        invoiceDate: testData.invoice.invoiceDate,
        batchGroupName: testData.invoice.batchGroupName,
        acqUnits: [testData.acqUnit.name],
        vendorInvoiceNo: testData.invoice.vendorInvoiceNo,
        vendorName: testData.organization.name,
        paymentMethod: testData.invoice.paymentMethod,
      });
      InvoiceEditForm.clickSaveButton();

      // Capture invoice id from url
      cy.url().then((url) => {
        testData.invoice.id = url.match(/\/invoice\/view\/([^/?#]+)/)?.[1] || null;
      });

      // Check created invoice details show the selected acquisition unit
      InvoiceView.waitLoading();
      InvoiceView.verifyAcquisitionUnits(testData.acqUnit.name);

      // Edit invoice and check acquisition unit selection is disabled
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.verifyAcqUnitSelectionDisabled();
      InvoiceEditForm.verifyAcqUnitSelected(testData.acqUnit.name);
    },
  );
});
