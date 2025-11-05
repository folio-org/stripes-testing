import { NavListItem } from '../../../../../interactors';

export default {
  selectApprovals: () => {
    cy.do(NavListItem('Approvals').click());
  },
  selectClosingPurchaseOrderReasons: () => {
    cy.do(NavListItem('Closing purchase order reasons').click());
  },
  selectOrderTemplates: () => {
    cy.do(NavListItem('Order templates').click());
  },
  selectPurchaseOrderLinesLimit: () => {
    cy.do(NavListItem('Purchase order lines limit').click());
  },
  selectOpeningPurchaseOrders: () => {
    cy.do(NavListItem('Opening purchase orders').click());
  },
  selectAcquisitionMethods: () => {
    cy.do(NavListItem('Acquisition methods').click());
  },
  selectCustomFieldsPurchaseOrders: () => {
    cy.do(NavListItem('Custom Fields - Purchase Orders').click());
  },
  selectCustomFieldsPurchaseOrderLines: () => {
    cy.do(NavListItem('Custom Fields - Purchase Order Lines').click());
  },
  selectPONumberEdit: () => {
    cy.do(NavListItem('Edit').click());
  },
  selectPrefixes: () => {
    cy.do(NavListItem('Prefixes').click());
  },
  selectCategories: () => {
    cy.do(NavListItem('Suffixes').click());
  },
  selectInstanceMatching: () => {
    cy.do(NavListItem('Instance matching').click());
  },
  selectInventoryInteractionsDefaults: () => {
    cy.do(NavListItem('Inventory interactions defaults').click());
  },
  selectInstanceStatus: () => {
    cy.do(NavListItem('Instance status').click());
  },
  selectInstanceType: () => {
    cy.do(NavListItem('Instance type').click());
  },
  selectLoanType: () => {
    cy.do(NavListItem('Loan type').click());
  },
  selectRoutingAddress: () => {
    cy.do(NavListItem('Routing address').click());
  },
  selectListConfiguration: () => {
    cy.do(NavListItem('List configuration').click());
  },
  selectOrderTemplateCategories: () => {
    cy.do(NavListItem('Order template categories').click());
  },
};
