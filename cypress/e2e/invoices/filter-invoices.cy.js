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

const trace = (message) => cy.task('log', `[C6724] ${message}`);

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

// For some reason the test is causing pipeline worker to freeze, so skipping it for now. It works fine locally.
// Need to investigate why it is happening and fix it.
// #freeze pipeline deadlock
describe('Invoices', () => {
  const flow = new ExecutionFlowManager();

  const postfix = getRandomPostfix();
  const isolatingTagName = `AT_C6724_ISOLATING_TAG_${postfix}`;

  before(() => {
    trace('SETUP: start');

    trace('Operation: cy.getAdminToken (line 52)');
    cy.getAdminToken();
    trace('Operation: cy.clearAllLocalStorage (line 53)');
    cy.clearAllLocalStorage();
    trace('Operation: cy.getTenantLocaleApi (line 54)');
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    flow
      .step((currentFlow) => {
        trace('SETUP step 1: createTagApi');

        trace('Operation: cy.createTagApi (line 58)');
        return cy.createTagApi({ label: isolatingTagName }).then((id) => {
          return currentFlow.set(R.TAG, { id, label: isolatingTagName }, () => {
            trace('Operation: cy.deleteTagApi (line 59)');
            return cy.deleteTagApi(id, true);
          });
        });
      })
      .step((currentFlow) => {
        trace('SETUP step 2: createBudgetWithFundLedgerAndFYViaApi');

        trace('Operation: Budgets.createBudgetWithFundLedgerAndFYViaApi (line 63)');
        const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
          budget: { allocated: 100 },
        });

        trace('Operation: cy.then (line 67)');
        return cy.then(() => {
          currentFlow
            .set(R.FISCAL_YEAR, fiscalYear, () => {
              trace('Operation: FiscalYears.deleteFiscalYearViaApi (line 69)');
              return FiscalYears.deleteFiscalYearViaApi(fiscalYear.id, false);
            })
            .set(R.FUND, fund, () => {
              trace('Operation: Funds.deleteFundViaApi (line 70)');
              return Funds.deleteFundViaApi(fund.id, false);
            })
            .set(R.BUDGET, budget, () => {
              trace('Operation: Budgets.deleteViaApi (line 71)');
              return Budgets.deleteViaApi(budget.id, false);
            });
        });
      })
      .step((currentFlow) => {
        trace('SETUP step 3: create organization');

        const organization = NewOrganization.getDefaultOrganization();

        trace('Operation: Organizations.createOrganizationViaApi (line 77)');
        return Organizations.createOrganizationViaApi(organization, { returnBody: true }).then(
          (responseOrganizations) => {
            return currentFlow.set(R.ORGANIZATION, responseOrganizations, () => {
              trace('Operation: Organizations.deleteOrganizationViaApi (line 79)');
              return Organizations.deleteOrganizationViaApi(responseOrganizations);
            });
          },
        );
      })
      .step((currentFlow) => {
        trace('SETUP step 4: getBookMaterialType');

        trace('Operation: cy.getBookMaterialType (line 84)');
        return cy.getBookMaterialType().then((mType) => currentFlow.set(R.MATERIAL_TYPE, mType));
      })
      .step((currentFlow) => {
        trace('SETUP step 5: getAcquisitionMethodsApi');

        trace('Operation: cy.getAcquisitionMethodsApi (line 87)');
        return cy
          .getAcquisitionMethodsApi()
          .then(({ body }) => currentFlow.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0]));
      })
      .step((currentFlow) => {
        trace('SETUP step 6: getLocations');

        trace('Operation: cy.getLocations (line 92)');
        return cy
          .getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` })
          .then((locationResp) => currentFlow.set(R.LOCATION, locationResp));
      })
      .step((currentFlow) => {
        trace('SETUP step 7: createOrderViaApi');

        trace('Operation: Orders.createOrderViaApi (line 97)');
        return Orders.createOrderViaApi({
          ...NewOrder.getDefaultOngoingOrder,
          orderType: ORDER_TYPES.ONGOING,
          ongoing: { isSubscription: false, manualRenewal: false },
          approved: true,
          reEncumber: true,
          vendor: currentFlow.get(R.ORGANIZATION).id,
          tags: { tagList: [currentFlow.get(R.TAG).label] },
        }).then((orderResponse) => currentFlow.set(R.ORDER, orderResponse, () => {
          trace('Operation: Orders.deleteOrderViaApi (line 105)');
          return Orders.deleteOrderViaApi(orderResponse.id, false);
        }));
      })
      .step((currentFlow) => {
        trace('SETUP step 8: createOrderLineViaApi');

        trace('Operation: OrderLines.createOrderLineViaApi (line 108)');
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
        }).then((orderLineResponse) => currentFlow.set(R.ORDER_LINE, orderLineResponse, () => {
          trace('Operation: OrderLines.deleteOrderLineViaApi (line 140)');
          return OrderLines.deleteOrderLineViaApi(orderLineResponse.id, false);
        }));
      })
      .step((currentFlow) => {
        trace('SETUP step 9: updateOrderViaApi');

        trace('Operation: Orders.updateOrderViaApi (line 143)');
        return Orders.updateOrderViaApi({
          ...currentFlow.get(R.ORDER),
          workflowStatus: ORDER_STATUSES.OPEN,
        })
          .then(() => {
            trace('Operation: Orders.getOrderByIdViaApi (line 147)');
            return Orders.getOrderByIdViaApi(currentFlow.get(R.ORDER).id);
          })
          .then((orderResponse) => currentFlow.set(R.ORDER, orderResponse));
      })
      .step((currentFlow) => {
        trace('SETUP step 10: createInvoiceWithInvoiceLineViaApi');

        trace('Operation: Invoices.createInvoiceWithInvoiceLineViaApi (line 151)');
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
          .then((invoiceResponse) => currentFlow.set(R.INVOICE, invoiceResponse, () => {
            trace('Operation: Invoices.deleteInvoiceViaApi (line 161)');
            return Invoices.deleteInvoiceViaApi(invoiceResponse.id);
          }))
          .then(() => {
            trace('Operation: Invoices.changeInvoiceStatusViaApi (line 163)');
            Invoices.changeInvoiceStatusViaApi({
              invoice: currentFlow.get(R.INVOICE),
              status: INVOICE_STATUSES.APPROVED,
            });
          });
      })
      .step((currentFlow) => {
        trace('SETUP step 11: createTempUser');

        trace('Operation: cy.createTempUser (line 170)');
        return cy
          .createTempUser([Permissions.uiInvoicesCanViewInvoicesAndInvoiceLines.gui])
          .then((userProperties) => {
            currentFlow.set(R.USER, userProperties, () => {
              trace('Operation: Users.deleteViaApi (line 173)');
              return Users.deleteViaApi(userProperties.userId);
            });

            trace('Operation: cy.login (line 175)');
            cy.login(userProperties.username, userProperties.password, { trace });
          });
      });

    trace('SETUP: complete');
  });

  after(() => {
    trace('CLEANUP: start');

    trace('Operation: cy.getAdminToken (line 181)');
    cy.getAdminToken();
    trace('Operation: flow.cleanup (line 182)');
    flow.cleanup();

    trace('CLEANUP: complete');
  });

  const isolateInvoicesList = () => {
    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 186)');
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.INVOICES,
      trigger: () => {
        trace('Operation: Invoices.filterByTags (line 189)');
        Invoices.filterByTags([flow.get(R.TAG).label]);
      },
    });
  };

  // For some reason the test is causing pipeline worker to freeze, so skipping it for now. It works fine locally.
  // Need to investigate why it is happening and fix it.
  // #freeze pipeline deadlock
  it(
    'C6724 Test the invoice filters (thunderjet)',
    { tags: ['criticalPathBroken', 'thunderjet', 'C6724Broken'] },
    () => {
      trace('TEST: start');

      const todayDateFormatted = formatDate(flow.get(R.LOCALE), new Date());

      const CASES = [
        {
          name: INVOICE_FILTERS_LABELS.INVOICE_STATUS,
          filterActions: () => {
            trace('Operation: Invoices.selectStatusFilter (line 207)');
            Invoices.selectStatusFilter(INVOICE_STATUSES.APPROVED);
          },
        },
        {
          name: INVOICE_FILTERS_LABELS.VENDOR_NAME,
          filterActions: () => {
            trace('Operation: Invoices.selectVendorFilter (line 213)');
            Invoices.selectVendorFilter(flow.get(R.ORGANIZATION));
          },
        },
        {
          name: INVOICE_FILTERS_LABELS.INVOICE_DATE,
          filterActions: () => {
            trace('Operation: Invoices.selectInvoiceDateFilter (line 219)');
            Invoices.selectInvoiceDateFilter(todayDateFormatted, todayDateFormatted);
          },
        },
        {
          name: INVOICE_FILTERS_LABELS.APPROVAL_DATE,
          filterActions: () => {
            trace('Operation: Invoices.selectApprovalDateFilter (line 225)');
            Invoices.selectApprovalDateFilter(todayDateFormatted, todayDateFormatted);
          },
        },
        {
          name: INVOICE_FILTERS_LABELS.FUND_CODE,
          filterActions: () => {
            trace('Operation: Invoices.selectFundCodeFilter (line 231)');
            Invoices.selectFundCodeFilter(flow.get(R.FUND).code);
          },
        },
        {
          name: INVOICE_FILTERS_LABELS.BATCH_GROUP,
          filterActions: () => {
            trace('Operation: Invoices.selectBatchGroupFilter (line 237)');
            Invoices.selectBatchGroupFilter('FOLIO');
          },
        },
        {
          name: INVOICE_FILTERS_LABELS.FISCAL_YEAR,
          filterActions: () => {
            trace('Operation: Invoices.selectFiscalYearFilter (line 243)');
            Invoices.selectFiscalYearFilter(flow.get(R.FISCAL_YEAR).code);
          },
        },
      ];

      trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 248)');
      PaneRequestWaiter.waitForPaneRequests({
        pane: PANE_REQUEST_PROFILE_NAMES.INVOICES,
        phase: PANE_REQUEST_PHASES.FILTERS,
        trigger: () => {
          trace('Operation: TopMenuNavigation.navigateToApp (line 252)');
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
          trace('Operation: Invoices.waitLoading (line 253)');
          Invoices.waitLoading();
        },
      });

      trace('Operation: CASES.forEach (line 257)');
      CASES.forEach((filter) => {
        trace(`<--- Filter by '${filter.name}' --->`);
        trace('Operation: isolateInvoicesList (line 259)');
        isolateInvoicesList();

        trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 261)');
        PaneRequestWaiter.waitForPaneRequests({
          pane: PANE_REQUEST_PROFILE_NAMES.INVOICES,
          trigger: () => {
            trace('Operation: filter.filterActions (line 264)');
            filter.filterActions(flow);
          },
        });

        trace('Operation: Invoices.waitResultsListLoading (line 268)');
        Invoices.waitResultsListLoading();
        trace('Operation: Invoices.verifySearchResult (line 269)');
        Invoices.verifySearchResult(flow.get(R.INVOICE).vendorInvoiceNo);
        trace('Operation: Invoices.clearAllFilters (line 270)');
        Invoices.clearAllFilters({ skipDisabled: false });
      });

      trace('TEST: complete');
    },
  );
});
