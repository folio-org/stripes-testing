import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import InvoiceEditForm from '../../support/fragments/invoices/invoiceEditForm';
import InvoiceView from '../../support/fragments/invoices/invoiceView';
import Invoices from '../../support/fragments/invoices/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Permissions from '../../support/dictionary/permissions';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Invoices', () => {
  const testData = {
    acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit(),
    organization: NewOrganization.getDefaultOrganization(),
    invoice: {},
    user: {},
    membershipId: null,
  };

  before(() => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        cy.getBatchGroups().then((batchGroup) => {
          Invoices.createInvoiceViaApi({
            vendorId: testData.organization.id,
            batchGroupId: batchGroup.id,
            accountingCode: testData.organization.erpCode,
          }).then((invoice) => {
            testData.invoice = invoice;

            AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then(() => {
              cy.createTempUser([
                Permissions.viewEditCreateInvoiceInvoiceLine.gui,
                Permissions.uiInvoicesManageAcquisitionUnits.gui,
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
    'C196778 Invoice: Manage acquisition units (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C196778'] },
    () => {
      // Search for the invoice and assign acquisition unit
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();
      InvoiceView.openInvoiceEditForm();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.fillInvoiceFields({ acqUnits: [testData.acqUnit.name] });
      InvoiceEditForm.clickSaveButton();

      // Check edited invoice details
      InvoiceView.waitLoading();
      InvoiceView.verifyAcquisitionUnits(testData.acqUnit.name);

      // Create a new invoice and check acquisition unit selection is disabled
      Invoices.closeInvoiceDetailsPane();
      Invoices.openNewInvoiceForm();
      InvoiceEditForm.waitLoading();
      InvoiceEditForm.verifyAcqUnitSelectionDisabled();
    },
  );
});
