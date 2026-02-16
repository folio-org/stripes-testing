import { Permissions } from '../../support/dictionary';
import BrowseContributors from '../../support/fragments/inventory/search/browseContributors';
import { NewInvoice, Invoices, InvoiceView } from '../../support/fragments/invoices';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import { BatchGroups } from '../../support/fragments/settings/invoices';
import OrdersHelper from '../../support/fragments/orders/ordersHelper';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Invoices', () => {
  const invoiceOrganization = NewOrganization.getDefaultOrganization();
  const orderOrganization = NewOrganization.getDefaultOrganization();

  const orderLine = {
    ...BasicOrderLine.defaultOrderLine,
    details: {
      productIds: [
        {
          productId: '9781868885015',
          productIdType: '',
        },
      ],
      subscriptionInterval: 0,
    },
    donor: `Autotest_donor_${getRandomPostfix()}`,
    publisher: `Autotest_Publishing_${getRandomPostfix()}`,
    requester: `Autotest_requester_${getRandomPostfix()}`,
    selector: `Autotest_selector_${getRandomPostfix()}`,
    fundDistribution: [],
    physical: {
      createInventory: 'Instance, Holding, Item',
      materialType: '',
      materialSupplier: '',
      volumes: [`test_vol_${getRandomPostfix()}`],
    },
    eresource: {
      activated: false,
      createInventory: 'None',
      trial: false,
      accessProvider: null,
    },
    vendorDetail: {
      instructions: `autotest_instructions_${getRandomPostfix()}`,
      noteFromVendor: `autotest_note_${getRandomPostfix()}`,
      referenceNumbers: [
        {
          refNumber: `ref_${getRandomPostfix()}`,
          refNumberType: 'Vendor title number',
          vendorDetailsSource: 'OrderLine',
        },
      ],
      vendorAccount: `${getRandomPostfix()}`,
    },
    contributors: [
      {
        contributor: `Autotest_Contributor_${getRandomPostfix()}`,
        contributorNameTypeId: '',
      },
    ],
  };

  const testData = {
    invoiceOrganization,
    orderOrganization,
    batchGroup: BatchGroups.getDefaultBatchGroup(),
    invoice: {
      ...NewInvoice.defaultUiInvoice,
      accountingCode: invoiceOrganization.erpCode,
      vendorName: invoiceOrganization.name,
    },
    order: {},
    orderLine,
    user: {},
  };

  const searchOptions = [
    { searchOption: 'Contributor', value: testData.orderLine.contributors[0].contributor },
    { searchOption: 'Requester', value: testData.orderLine.requester },
    { searchOption: 'Title or package name', value: testData.orderLine.titleOrPackage },
    { searchOption: 'Publisher', value: testData.orderLine.publisher },
    { searchOption: 'Vendor account', value: testData.orderLine.vendorDetail.vendorAccount },
    {
      searchOption: 'Vendor reference number',
      value: testData.orderLine.vendorDetail.referenceNumbers[0].refNumber,
    },
    { searchOption: 'Donor (Deprecated)', value: testData.orderLine.donor },
    { searchOption: 'Selector', value: testData.orderLine.selector },
    { searchOption: 'Volumes', value: testData.orderLine.physical.volumes[0] },
    { searchOption: 'Product ID', value: testData.orderLine.details.productIds[0].productId },
    { searchOption: 'Product ID ISBN', value: testData.orderLine.details.productIds[0].productId },
  ];

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.invoiceOrganization).then(() => {
        Organizations.createOrganizationViaApi(testData.orderOrganization).then(() => {
          testData.order = NewOrder.getDefaultOrder({ vendorId: testData.orderOrganization.id });
          testData.orderLine.physical.materialSupplier = testData.orderOrganization.id;
          testData.orderLine.eresource.accessProvider = testData.orderOrganization.id;

          cy.getLocations({ query: `name="${OrdersHelper.mainLibraryLocation}"` }).then(
            (location) => {
              testData.orderLine.locations[0].locationId = location.id;
            },
          );

          cy.getBookMaterialType().then((materialType) => {
            testData.orderLine.physical.materialType = materialType.id;
          });

          cy.getProductIdTypes({ query: 'name=="ISBN"' }).then((productIdType) => {
            testData.orderLine.details.productIds[0].productIdType = productIdType.id;
          });

          BrowseContributors.getContributorTypes().then((contributorTypes) => {
            testData.orderLine.contributors[0].contributorNameTypeId = contributorTypes[0].id;
          });

          Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then(
            (order) => {
              testData.order = order;
            },
          );

          BatchGroups.createBatchGroupViaApi(testData.batchGroup).then((batchGroup) => {
            testData.invoice.batchGroup = batchGroup.name;

            Invoices.createInvoiceViaApi({
              vendorId: testData.invoiceOrganization.id,
              accountingCode: testData.invoiceOrganization.erpCode,
              batchGroupId: batchGroup.id,
            }).then((invoice) => {
              testData.invoice = invoice;
            });
          });
        });
      });
    });

    cy.createTempUser([
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiOrdersView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      Invoices.deleteInvoiceViaApi(testData.invoice.id);
      Orders.deleteOrderViaApi(testData.order.id);
      Organizations.deleteOrganizationViaApi(testData.invoiceOrganization.id);
      Organizations.deleteOrganizationViaApi(testData.orderOrganization.id);
    });
  });

  it(
    'C350741 Adding POL to a new Invoice Line with DIFFERENT Vendors via search and filter options (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C350741'] },
    () => {
      Invoices.searchByNumber(testData.invoice.vendorInvoiceNo);
      Invoices.selectInvoice(testData.invoice.vendorInvoiceNo);
      InvoiceView.waitLoading();

      const SelectOrderLinesModal = InvoiceView.openSelectOrderLineModal();
      SelectOrderLinesModal.verifyModalView();

      searchOptions.forEach(({ searchOption, value }) => {
        SelectOrderLinesModal.searchByParameter(searchOption, value);
        SelectOrderLinesModal.checkSearchResults(testData.orderLine.titleOrPackage);
        SelectOrderLinesModal.resetFilters();
      });

      SelectOrderLinesModal.searchByName(testData.order.poNumber);
      SelectOrderLinesModal.selectFromSearchResults();
      SelectOrderLinesModal.clickSaveButton();

      SelectOrderLinesModal.checkForDifferentVendorWarningAndConfirm();

      InvoiceView.checkInvoiceLinesTableContent([
        {
          poNumber: testData.order.poNumber,
          description: testData.orderLine.titleOrPackage,
        },
      ]);
    },
  );
});
