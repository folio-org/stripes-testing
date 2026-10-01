import {
  APPLICATION_NAMES,
  INVOICE_FILTERS_LABELS,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_LINE_DISCOUNT_TYPES,
  ORDER_STATUSES,
  ORDER_TYPES,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import { FiscalYears, Funds } from '../../support/fragments/finance';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import Invoices from '../../support/fragments/invoices/invoices';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { ExecutionFlowManager, PaneRequestWaiter } from '../../support/utils';
import { formatDate } from '../../support/utils/acquisitions';
import {
  PANE_REQUEST_PHASES,
  PANE_REQUEST_PROFILE_NAMES,
} from '../../support/utils/paneRequestWaiter';
import getRandomPostfix from '../../support/utils/stringTools';

const R = {
  ACQUISITION_METHOD: 'acquisitionMethod',
  FISCAL_YEAR: 'fiscalYear',
  FUND: 'fund',
  BUDGET: 'budget',
  INVOICE: 'invoice',
  LOCALE: 'locale',
  MATERIAL_TYPE: 'materialType',
  ORDER: 'order',
  ORDER_LINE: 'orderLine',
  ORGANIZATION: 'organization',
  TAG: 'isolatingTag,',
  USER: 'user',
};

describe('Invoices', () => {
  const flow = new ExecutionFlowManager();

  const postfix = getRandomPostfix();
  const isolatingTagName = `AT_C6724_ISOLATING_TAG_${postfix}`;

  before(() => {
    cy.getAdminToken();
    cy.clearAllLocalStorage();
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    flow
      .step((currentFlow) => {
        return cy.createTagApi({ label: isolatingTagName }).then((id) => {
          return currentFlow.set(R.TAG, { id, label: isolatingTagName }, () => cy.deleteTagApi(id, true));
        });
      })
      .step((currentFlow) => {
        const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
          budget: { allocated: 100 },
        });

        return cy.then(() => {
          currentFlow
            .set(R.FISCAL_YEAR, fiscalYear, () => FiscalYears.deleteFiscalYearViaApi(fiscalYear.id, false))
            .set(R.FUND, fund, () => Funds.deleteFundViaApi(fund.id, false))
            .set(R.BUDGET, budget, () => Budgets.deleteViaApi(budget.id, false));
        });
      })
      .step((currentFlow) => {
        const organization = NewOrganization.getDefaultOrganization();

        return Organizations.createOrganizationViaApi(organization, { returnBody: true }).then(
          (responseOrganizations) => {
            return currentFlow.set(R.ORGANIZATION, responseOrganizations, () => Organizations.deleteOrganizationViaApi(responseOrganizations));
          },
        );
      })
      .step((currentFlow) => {
        return cy.getBookMaterialType().then((mType) => currentFlow.set(R.MATERIAL_TYPE, mType));
      })
      .step((currentFlow) => {
        return cy
          .getAcquisitionMethodsApi()
          .then(({ body }) => currentFlow.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0]));
      })
      .step((currentFlow) => {
        return cy
          .getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` })
          .then((locationResp) => currentFlow.set(R.LOCATION, locationResp));
      })
      .step((currentFlow) => {
        return Orders.createOrderViaApi({
          ...NewOrder.getDefaultOngoingOrder,
          orderType: ORDER_TYPES.ONGOING,
          ongoing: { isSubscription: false, manualRenewal: false },
          approved: true,
          reEncumber: true,
          vendor: currentFlow.get(R.ORGANIZATION).id,
          tags: { tagList: [currentFlow.get(R.TAG).label] },
        }).then((orderResponse) => currentFlow.set(R.ORDER, orderResponse, () => Orders.deleteOrderViaApi(orderResponse.id, false)));
      })
      .step((currentFlow) => {
        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.defaultOrderLine,
          tags: { tagList: [currentFlow.get(R.TAG).label] },
          purchaseOrderId: currentFlow.get(R.ORDER).id,
          cost: {
            listUnitPrice: 100.0,
            currency: 'USD',
            discountType: ORDER_LINE_DISCOUNT_TYPES.PERCENTAGE,
            quantityPhysical: 1,
            poLineEstimatedPrice: 100.0,
          },
          fundDistribution: [
            {
              code: currentFlow.get(R.FUND).code,
              fundId: currentFlow.get(R.FUND).id,
              value: 100,
            },
          ],
          locations: [
            {
              locationId: currentFlow.get(R.LOCATION).id,
              quantity: 1,
              quantityPhysical: 1,
            },
          ],
          acquisitionMethod: currentFlow.get(R.ACQUISITION_METHOD).id,
          physical: {
            createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
            materialType: currentFlow.get(R.MATERIAL_TYPE).id,
            materialSupplier: currentFlow.get(R.ORGANIZATION).id,
            volumes: [],
          },
        }).then((orderLineResponse) => currentFlow.set(R.ORDER_LINE, orderLineResponse, () => OrderLines.deleteOrderLineViaApi(orderLineResponse.id, false)));
      })
      .step((currentFlow) => {
        return Orders.updateOrderViaApi({
          ...currentFlow.get(R.ORDER),
          workflowStatus: ORDER_STATUSES.OPEN,
        })
          .then(() => Orders.getOrderByIdViaApi(currentFlow.get(R.ORDER).id))
          .then((orderResponse) => currentFlow.set(R.ORDER, orderResponse));
      })
      .step((currentFlow) => {
        return Invoices.createInvoiceWithInvoiceLineViaApi({
          vendorId: currentFlow.get(R.ORGANIZATION).id,
          fiscalYearId: currentFlow.get(R.FISCAL_YEAR).id,
          poLineId: currentFlow.get(R.ORDER_LINE).id,
          fundDistributions: currentFlow.get(R.ORDER_LINE).fundDistribution,
          accountingCode: currentFlow.get(R.ORGANIZATION).erpCode,
          releaseEncumbrance: true,
          subTotal: 100,
          tags: [currentFlow.get(R.TAG).label],
        })
          .then((invoiceResponse) => currentFlow.set(R.INVOICE, invoiceResponse, () => Invoices.deleteInvoiceViaApi(invoiceResponse.id)))
          .then(() => {
            Invoices.changeInvoiceStatusViaApi({
              invoice: currentFlow.get(R.INVOICE),
              status: INVOICE_STATUSES.APPROVED,
            });
          });
      })
      .step((currentFlow) => {
        return cy
          .createTempUser([Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui])
          .then((userProperties) => {
            currentFlow.set(R.USER, userProperties, () => Users.deleteViaApi(userProperties.userId));

            cy.login(userProperties.username, userProperties.password);
          });
      });
  });

  after(() => {
    cy.getAdminToken();
    flow.cleanup();
  });

  const isolateInvoicesList = () => {
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.INVOICES,
      trigger: () => {
        Invoices.filterByTags([flow.get(R.TAG).label]);
      },
    });
  };

  it(
    'C6724 Test the invoice filters (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C6724'] },
    () => {
      const todayDateFormatted = formatDate(flow.get(R.LOCALE), new Date());

      const CASES = [
        {
          name: INVOICE_FILTERS_LABELS.INVOICE_STATUS,
          filterActions: () => {
            Invoices.selectStatusFilter(INVOICE_STATUSES.APPROVED);
          },
        },
        {
          name: INVOICE_FILTERS_LABELS.VENDOR_NAME,
          filterActions: () => {
            Invoices.selectVendorFilter(flow.get(R.ORGANIZATION));
          },
        },
        {
          name: INVOICE_FILTERS_LABELS.INVOICE_DATE,
          filterActions: () => {
            Invoices.selectInvoiceDateFilter(todayDateFormatted, todayDateFormatted);
          },
        },
        {
          name: INVOICE_FILTERS_LABELS.APPROVAL_DATE,
          filterActions: () => {
            Invoices.selectApprovalDateFilter(todayDateFormatted, todayDateFormatted);
          },
        },
        {
          name: INVOICE_FILTERS_LABELS.FUND_CODE,
          filterActions: () => {
            Invoices.selectFundCodeFilter(flow.get(R.FUND).code);
          },
        },
        {
          name: INVOICE_FILTERS_LABELS.BATCH_GROUP,
          filterActions: () => {
            Invoices.selectBatchGroupFilter('FOLIO');
          },
        },
        {
          name: INVOICE_FILTERS_LABELS.FISCAL_YEAR,
          filterActions: () => {
            Invoices.selectFiscalYearFilter(flow.get(R.FISCAL_YEAR).code);
          },
        },
      ];

      PaneRequestWaiter.waitForPaneRequests({
        pane: PANE_REQUEST_PROFILE_NAMES.INVOICES,
        phase: PANE_REQUEST_PHASES.FILTERS,
        trigger: () => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
          Invoices.waitLoading();
        },
      });

      CASES.forEach((filter) => {
        cy.log(`<--- Filter by '${filter.name}' --->`);
        isolateInvoicesList();

        PaneRequestWaiter.waitForPaneRequests({
          pane: PANE_REQUEST_PROFILE_NAMES.INVOICES,
          trigger: () => {
            filter.filterActions(flow);
          },
        });

        Invoices.waitResultsListLoading();
        Invoices.verifySearchResult(flow.get(R.INVOICE).vendorInvoiceNo);
        Invoices.clearAllFilters({ skipDisabled: false });
      });
    },
  );
});
