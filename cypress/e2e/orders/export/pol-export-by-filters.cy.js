import moment from 'moment';

import {
  COMMON_BUTTON_LABELS,
  DEFAULT_WAIT_TIME,
  ORDER_LINE_RESULTS_ACTIONS_LABELS,
  ORDER_LINE_RESULTS_LIST_COLUMNS,
} from '../../../support/constants';
import { OrderHelper, OrderLines, Orders, OrdersExport } from '../../../support/fragments/orders';
import { ExecutionFlowManager } from '../../../support/utils';
import FileManager from '../../../support/utils/fileManager';
import { buildExportReport } from '../../../support/utils/ordersExport';

const { EXPORT_CSV } = ORDER_LINE_RESULTS_ACTIONS_LABELS;

describe('Orders', () => {
  describe('Export', () => {
    const flow = new ExecutionFlowManager();
    const fileName = `order-export-${moment().format('YYYY-MM-DD')}-*.csv`;

    before('Create C196751 preconditions', () => {
      cy.clearLocalStorage();
      OrdersExport.createOrdersExportDataViaApi(flow);
    });

    after('Delete C196751 data (what can be deleted)', () => {
      cy.getAdminToken();
      FileManager.deleteFilesFromDownloadsByMask(fileName);
      flow.cleanup();
    });

    it(
      'C196751 Export orders based on orders lines search (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C196751'] },
      () => {
        const ctx = Object.fromEntries(flow.context);

        const {
          admin,
          acquisitionMethodsMap,
          acquisitionUnitsMap,
          addressesMap,
          contributorTypesMap,
          expenseClassesMap,
          fiscalYear,
          fundsMap,
          holdingsMap,
          identifierTypesMap,
          locale,
          locationsMap,
          materialTypesMap,
          orderLinesMap,
          ordersMap,
          organization,
          organizationTypesMap,
        } = ctx;

        const orderLines = Array.from(orderLinesMap.values()).sort((a, b) => a.poLineNumber.localeCompare(b.poLineNumber));
        const locationNames = Array.from(locationsMap.values()).map((location) => location.name);
        const fundCodes = Array.from(fundsMap.values()).map((fund) => fund.code);

        OrderHelper.interceptGetOrderLines();

        const waitForOrderLinesLoading = () => {
          OrderHelper.waitForOrderLinesQueryCompleted();
          OrderLines.waitResultsListLoading();
        };

        const performExportAndCheckFile = (filterFn, expectedOrderLines) => {
          filterFn();
          waitForOrderLinesLoading();
          OrderLines.assertResultsCount(expectedOrderLines.length);
          cy.wait(DEFAULT_WAIT_TIME);
          Orders.exportResultsToCsv();

          const content = expectedOrderLines.map((line) => {
            const order = ordersMap.get(line.purchaseOrderId);

            return buildExportReport({
              order,
              line,
              acquisitionMethodsMap,
              acquisitionUnitsMap,
              addressesMap,
              admin,
              contributorTypesMap,
              expenseClassesMap,
              fiscalYear,
              holdingsMap,
              identifierTypesMap,
              locale,
              locationsMap,
              materialTypesMap,
              organization,
              organizationTypesMap,
              orderLinesMap,
            });
          });

          OrderLines.checkDownloadedFile({ content });
        };

        OrderLines.resetFiltersIfActive();
        OrderLines.verifyNoResultsMessage();
        OrderLines.assertResultsActionIsDisabled(EXPORT_CSV);

        // Filter by location and check that export contains only order lines with that location
        performExportAndCheckFile(() => {
          locationNames.forEach((location) => {
            OrderLines.selectLocationInFilters(location);
            waitForOrderLinesLoading();
          });
          OrderLines.assertResultsActionIsDisabled(EXPORT_CSV, false);
          OrderLines.sortOrderLinesBy(ORDER_LINE_RESULTS_LIST_COLUMNS.PO_LINE_NUMBER);
        }, orderLines);

        // Filter by fund code and check that export contains only order lines with that fund code
        const filteredByFundCodeOrderLines = orderLines.filter((line) => line.fundDistribution?.some((fund) => fundCodes.includes(fundsMap.get(fund.fundId)?.code)));
        performExportAndCheckFile(
          () => OrderLines.filterByFundCodes(fundCodes),
          filteredByFundCodeOrderLines,
        );

        // Filter by rush and check that export contains only order lines with that rush value
        performExportAndCheckFile(
          () => OrderLines.filterByRush([COMMON_BUTTON_LABELS.YES]),
          filteredByFundCodeOrderLines.filter((line) => line.rush === true),
        );
      },
    );
  });
});
