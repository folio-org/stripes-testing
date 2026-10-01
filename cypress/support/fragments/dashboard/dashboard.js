import { Button } from '../../../../interactors';
import { COMMON_BUTTON_LABELS } from '../../constants';
import EditWidget from './editWidget';
import NewWidget from './newWidget';
import { Widget, WidgetTable, WidgetTableCell } from './widget';

const NEW_WIDGET = 'New widget';

const actionsButton = Button(COMMON_BUTTON_LABELS.ACTIONS);
const newWidgetButton = Button(NEW_WIDGET);

export default {
  waitLoading() {
    cy.get('div[class*="dashboardContainer"]').should('be.visible');
  },

  openNewWidget() {
    this.interceptGetWidgetDefinitions();
    cy.do([actionsButton.click(), newWidgetButton.click()]);
    NewWidget.waitLoading();
    this.waitForGetWidgetDefinitions();
  },

  openEditWidget(widgetName) {
    const widget = Widget({ title: widgetName });

    this.interceptGetWidgetDefinitions();
    cy.do(widget.clickAction(COMMON_BUTTON_LABELS.EDIT));
    EditWidget.waitLoading();
    this.waitForGetWidgetDefinitions();
  },

  assertWidgetTable(widgetName, rows, { assertRowCount = false } = {}) {
    const widget = Widget({ title: widgetName });
    const widgetTable = widget.find(WidgetTable());

    rows.forEach((columns) => {
      columns.forEach(({ column, content, index }) => {
        cy.expect(
          widgetTable
            .find(WidgetTableCell({ column, content, ...(index ? { row: index } : {}) }))
            .exists(),
        );
      });
    });

    if (assertRowCount) cy.expect(widgetTable.has({ rowCount: rows.length }));
  },

  clickCellInWidgetTable(widgetName, tableCell) {
    const widget = Widget({ title: widgetName });
    const widgetTable = widget.find(WidgetTable());

    cy.do(widgetTable.find(WidgetTableCell(tableCell)).hrefClick());
  },

  assertWidgets(widgetNames, { exactCount = true } = {}) {
    if (exactCount) cy.get('[class^="widgetContainer-"]').should('have.length', widgetNames.length);

    widgetNames.forEach((name) => {
      cy.expect(Widget({ title: name }).exists());
    });
  },

  /* API */
  getServiceInteractionWidgetsViaApi() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'servint/widgets/definitions/global',
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },

  createDashboardViaApi(dashboard) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'servint/dashboard',
        body: dashboard,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => body);
  },

  deleteDashboardViaApi(dashboardId, { failOnStatusCode = false } = {}) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `servint/dashboard/${dashboardId}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode,
    });
  },

  deleteWidgetViaApi(widgetId, { failOnStatusCode = false } = {}) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `servint/widgets/instances/${widgetId}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode,
    });
  },

  /* INTERCEPTIONS */
  interceptGetWidgetDefinitions() {
    return cy
      .intercept('GET', 'servint/widgets/definitions/global**')
      .as('waiterForGetWidgetDefinitions');
  },

  waitForGetWidgetDefinitions() {
    return cy.wait('@waiterForGetWidgetDefinitions');
  },
};
