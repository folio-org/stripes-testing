import { including } from '@interactors/html';
import {
  Button,
  Checkbox,
  InfoRow,
  KeyValue,
  Link,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneHeader,
  Section,
  Warning,
  MultiColumnListHeader,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';
import InteractorsTools from '../../utils/interactorsTools';
import ExportDetails from '../exportManager/exportDetails';
import TransactionDetails from '../finance/transactions/transactionDetails';
import InventoryInstance from '../inventory/inventoryInstance';
import CancelConfirmationModal from './modals/cancelConfirmationModal';
import SelectInstanceModal from './modals/selectInstanceModal';
import OrderLineEditForm from './orderLineEditForm';
import VersionHistory from './orderVersionHistory';

const orderLineDetailsSection = Section({ id: 'order-lines-details' });
const paneHeaderOrderLinesDetailes = orderLineDetailsSection.find(
  PaneHeader({ id: 'paneHeaderorder-lines-details' }),
);
const backToOrderButton = Button({ id: 'clickable-backToPO' });
const actionsButton = Button('Actions');

const itemDetailsSection = orderLineDetailsSection.find(Section({ id: 'ItemDetails' }));
const purchaseOrderLineSection = orderLineDetailsSection.find(Section({ id: 'poLine' }));
const ongoingOrderSection = orderLineDetailsSection.find(Section({ id: 'ongoingOrder' }));
const fundDistributionsSection = orderLineDetailsSection.find(Section({ id: 'FundDistribution' }));
const vendorDetailsSection = orderLineDetailsSection.find(Section({ id: 'Vendor' }));
const costDetailsSection = orderLineDetailsSection.find(Section({ id: 'CostDetails' }));
const physicalResourceDetailsSection = orderLineDetailsSection.find(Section({ id: 'physical' }));
const locationDetailsSection = orderLineDetailsSection.find(Section({ id: 'location' }));
const exportDetailsSection = orderLineDetailsSection.find(Section({ id: 'exportDetails' }));
const headerLinesDetail = PaneHeader({ id: 'paneHeaderorder-lines-details' });
const versionHistoryButton = Button({ id: 'version-history-btn' });
const linkedInstancesDetailsSection = orderLineDetailsSection.find(
  Section({ id: 'linkedInstances' }),
);
const routingListSection = orderLineDetailsSection.find(Section({ id: 'routing-list' }));
const routingListAccordionButton = '#accordion-toggle-button-routing-list';
const routingListBadgeSelector = '[class*="badge"]';
const routingListContainer = '#routing-list';
const addRoutingListButton = Button('Add routing list');

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(orderLineDetailsSection.exists());
  },
  backToOrderDetails() {
    cy.do(backToOrderButton.click());
  },
  checkFieldsConditions(fields = []) {
    fields.forEach(({ label, conditions }) => {
      cy.expect(orderLineDetailsSection.find(KeyValue(label)).has(conditions));
    });
  },
  checkFieldsHasCopyIcon(fields = []) {
    fields.forEach(({ label }) => {
      cy.expect(
        orderLineDetailsSection
          .find(KeyValue(label))
          .find(Button({ icon: 'clipboard' }))
          .exists(),
      );
    });
  },
  checkOrderLineDetails({
    itemDetails,
    poLineInformation,
    vendorDetails,
    costDetails,
    locationDetails,
    physicalResourceDetails,
    linkedInstances,
  } = {}) {
    if (itemDetails) {
      this.checkItemDetailsSection(itemDetails);
    }
    if (poLineInformation) {
      this.checkPoLineInformationSection(poLineInformation);
    }
    if (vendorDetails) {
      this.checkVendorDetailsSection(vendorDetails);
    }
    if (costDetails) {
      this.checkCostDetailsSection(costDetails);
    }
    if (locationDetails) {
      this.checkLocationsSection(locationDetails);
    }
    if (physicalResourceDetails) {
      this.checkPhysicalResourceDetails(physicalResourceDetails);
    }
    if (linkedInstances) {
      this.checkLinkedInstancesTableContent(linkedInstances);
    }
  },
  copyOrderNumber(poNumber) {
    cy.do(
      purchaseOrderLineSection
        .find(KeyValue('POL number'))
        .find(Button({ icon: 'clipboard' }))
        .click(),
    );

    InteractorsTools.checkCalloutMessage(`Successfully copied "${poNumber}" to clipboard.`);
  },
  expandActionsDropdown() {
    cy.do(paneHeaderOrderLinesDetailes.find(actionsButton).click());
  },
  cancelOrderLine({ orderLineNumber, confirm = true } = {}) {
    this.expandActionsDropdown();
    cy.do(Button('Cancel').click());

    if (orderLineNumber) {
      CancelConfirmationModal.verifyModalView({ orderLineNumber });
    }

    if (confirm) {
      CancelConfirmationModal.clickCancelOrderLineButton();
    }
  },
  checActionsMenuContent(actions = []) {
    actions.forEach((action) => {
      cy.expect(Button(action).exists());
    });
  },
  changeInstanceConnection({ expand = true } = {}) {
    if (expand) {
      this.expandActionsDropdown();
    }
    cy.do(Button('Change instance connection').click());
    SelectInstanceModal.waitLoading();
    SelectInstanceModal.verifyModalView();

    return SelectInstanceModal;
  },
  openInventoryItem() {
    cy.do(itemDetailsSection.find(KeyValue('Title')).find(Link()).click());

    InventoryInstance.waitInventoryLoading();

    return InventoryInstance;
  },
  openOrderLineEditForm() {
    this.expandActionsDropdown();
    cy.do(Button('Edit').click());

    OrderLineEditForm.waitLoading();

    return OrderLineEditForm;
  },
  openEncumbrancePane(fundName) {
    this.clickTheLinkInFundDetailsSection({ fundName, columnIndex: 5 });

    TransactionDetails.waitLoading();

    return TransactionDetails;
  },
  clickTheLinkInFundDetailsSection({ fundName, columnIndex = 0 } = {}) {
    const tableRow = fundName
      ? fundDistributionsSection.find(
        MultiColumnListRow({ content: including(fundName), isContainer: true }),
      )
      : fundDistributionsSection.find(MultiColumnListRow({ rowIndexInParent: 'row-0' }));
    const link = tableRow.find(MultiColumnListCell({ columnIndex })).find(Link());

    cy.do([link.perform((el) => el.removeAttribute('target')), link.click()]);
  },
  checkExportJobDetailsPresent(present = true) {
    if (present) {
      cy.expect(exportDetailsSection.exists());
    } else {
      cy.expect(exportDetailsSection.absent());
    }
  },
  expandExportJobDetails() {
    cy.do(exportDetailsSection.find(Button('Export details')).click());
  },
  openExportJobDetails({ rowIndex = 0, columnIndex = 0 } = {}) {
    cy.do(
      exportDetailsSection
        .find(MultiColumnListRow({ rowIndexInParent: `row-${rowIndex}` }))
        .find(MultiColumnListCell({ columnIndex }))
        .find(Link())
        .click(),
    );
    ExportDetails.waitLoading();

    return ExportDetails;
  },
  checkWarningMessage(message) {
    cy.expect(orderLineDetailsSection.find(Warning()).has({ message }));
  },
  checkContributorsSectionContent(contributors = []) {
    contributors.forEach(({ name, type }) => {
      cy.expect(
        orderLineDetailsSection
          .find(KeyValue('Contributors'))
          .find(MultiColumnListRow({ isContainer: true, content: including(name) }))
          .find(MultiColumnListCell({ columnIndex: 1 }))
          .has({ content: including(type) }),
      );
    });
  },
  checkFundDistibutionTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.name) {
        cy.expect(
          fundDistributionsSection
            .find(MultiColumnListCell({ row: index, column: 'Fund' }))
            .has({ content: including(record.name) }),
        );
      }
      if (record.expenseClass) {
        cy.expect(
          fundDistributionsSection
            .find(MultiColumnListCell({ row: index, column: 'Expense class' }))
            .has({ content: including(record.expenseClass) }),
        );
      }
      if (record.value) {
        cy.expect(
          fundDistributionsSection
            .find(MultiColumnListCell({ row: index, column: 'Value' }))
            .has({ content: including(record.value) }),
        );
      }
      if (record.amount) {
        cy.expect(
          fundDistributionsSection
            .find(MultiColumnListCell({ row: index, column: 'Amount' }))
            .has({ content: including(record.amount) }),
        );
      }
      if (record.initialEncumbrance) {
        cy.expect(
          fundDistributionsSection
            .find(MultiColumnListCell({ row: index, column: 'Initial encumbrance' }))
            .has({ content: including(record.initialEncumbrance) }),
        );
      }
      if (record.currentEncumbrance) {
        cy.expect(
          fundDistributionsSection
            .find(MultiColumnListCell({ row: index, column: 'Current encumbrance' }))
            .has({ content: including(record.currentEncumbrance) }),
        );
      }
    });

    if (!records.length) {
      cy.expect(fundDistributionsSection.has({ text: including('The list contains no items') }));
    }
  },
  checkExportDetailsTableContent(records = []) {
    records.forEach((record, index) => {
      if (record.date) {
        cy.expect(
          exportDetailsSection
            .find(MultiColumnListCell({ row: index, columnIndex: 1 }))
            .has({ content: including(record.date) }),
        );
      }
      if (record.fileName) {
        cy.expect(
          exportDetailsSection
            .find(MultiColumnListCell({ row: index, columnIndex: 2 }))
            .has({ content: including(record.fileName) }),
        );
      }
      if (record.configName) {
        cy.expect(
          exportDetailsSection
            .find(MultiColumnListCell({ row: index, columnIndex: 3 }))
            .has({ content: including(record.configName) }),
        );
      }
    });
  },
  checkLinkedInstancesTableContent(records = [], shouldExpand = true) {
    if (shouldExpand) {
      cy.do(linkedInstancesDetailsSection.find(Button('Linked instance')).click());
    }

    records.forEach((record, index) => {
      if (record.title) {
        cy.expect(
          linkedInstancesDetailsSection
            .find(MultiColumnListCell({ row: index, column: 'Title' }))
            .has({ content: including(record.title) }),
        );
      }
      if (record.contributors) {
        cy.expect(
          linkedInstancesDetailsSection
            .find(MultiColumnListCell({ row: index, column: 'Contributors' }))
            .has({ content: including(record.contributors) }),
        );
      }
      if (record.publisher) {
        cy.expect(
          linkedInstancesDetailsSection
            .find(MultiColumnListCell({ row: index, column: 'Publishers' }))
            .has({ content: including(record.publisher) }),
        );
      }
      if (record.relation) {
        cy.expect(
          linkedInstancesDetailsSection
            .find(MultiColumnListCell({ row: index, column: 'Relation' }))
            .has({ content: including(record.relation) }),
        );
      }
    });
  },
  checkItemDetailsSection(itemDetails = []) {
    this.checkSectionData({ details: itemDetails, section: itemDetailsSection });
  },
  checkPoLineInformationSection(poLineInformation = []) {
    this.checkSectionData({ details: poLineInformation, section: purchaseOrderLineSection });
  },
  checkOngoingOrderInformationSection(ongoingOrderInformation = []) {
    this.checkSectionData({ details: ongoingOrderInformation, section: ongoingOrderSection });
  },
  checkVendorDetailsSection(vendorDetails = []) {
    this.checkSectionData({ details: vendorDetails, section: vendorDetailsSection });
  },
  checkCostDetailsSection(costDetails = []) {
    this.checkSectionData({ details: costDetails, section: costDetailsSection });
  },
  checkPhysicalResourceDetails(physicalResourceDetails = []) {
    this.checkSectionData({
      details: physicalResourceDetails,
      section: physicalResourceDetailsSection,
    });
  },
  checkSectionData({ details, section }) {
    details.forEach(({ key, value, checkbox }) => {
      if (checkbox) {
        cy.expect(section.find(Checkbox(key)).has(value));
      } else {
        cy.expect(section.find(KeyValue(key)).has({ value: including(value) }));
      }
    });
  },
  checkLocationsSection({ locations = [] } = {}) {
    locations.forEach((locationInformation, index) => {
      locationInformation.forEach(({ key, value }) => {
        cy.expect(
          locationDetailsSection
            .find(InfoRow({ index }))
            .find(KeyValue(key))
            .has({ value: including(value) }),
        );
      });
    });
  },
  verifyLinesDetailTitle(title) {
    cy.expect(orderLineDetailsSection.find(headerLinesDetail).has({ text: including(title) }));
  },
  openVersionHistory() {
    cy.do(versionHistoryButton.click());
    VersionHistory.waitLoading();

    return VersionHistory;
  },
  checkRoutingListSectionPresence(shouldBePresent = true) {
    if (shouldBePresent) {
      cy.expect(routingListSection.exists());
    } else {
      cy.expect(routingListSection.absent());
    }
  },
  checkRoutingListSectionCollapsed() {
    cy.get(routingListAccordionButton)
      .scrollIntoView()
      .should('have.attr', 'aria-expanded', 'false');
  },
  checkRoutingListSectionCounter(count) {
    if (count === '0') {
      cy.get(routingListAccordionButton).should('exist');
    } else {
      cy.get(routingListAccordionButton).find(routingListBadgeSelector).should('have.text', count);
    }
  },
  expandRoutingListSection() {
    cy.get(routingListAccordionButton).scrollIntoView().should('be.visible').click();
  },
  checkRoutingListSectionExpanded() {
    cy.get(routingListAccordionButton).should('have.attr', 'aria-expanded', 'true');
  },
  checkNoRoutingListsText() {
    cy.get(routingListContainer).should('contain.text', 'No routing lists');
  },
  openRoutingListsAccordion: () => {
    cy.do(Button({ id: 'accordion-toggle-button-routing-list' }).click());
  },

  addRoutingListButtonExist: () => {
    cy.expect(routingListSection.find(addRoutingListButton).exists());
  },

  addRoutingList: () => {
    cy.do(routingListSection.find(addRoutingListButton).click());
  },

  addRoutingListByActions: () => {
    cy.do([routingListSection.find(actionsButton).click(), addRoutingListButton.click()]);
  },

  verifyAddingRoutingList: (name) => {
    cy.expect(routingListSection.find(MultiColumnListCell(name)).exists());
  },

  openRoutingList: (name) => {
    cy.do(routingListSection.find(MultiColumnListCell(name)).find(Link()).click());
  },

  addRoutingListIsDisabled() {
    this.clickActionsButtonInRoutingList();
    cy.get('[class^=overlay-]')
      .find('[data-test-routing-list-button="true"]')
      .should('have.attr', 'disabled');
  },

  clickActionsButtonInRoutingList() {
    cy.do(routingListSection.find(actionsButton).click());
  },

  verifyRoutingListAccordionRecordCount(expectedCount) {
    cy.get(routingListContainer).find('[class*="mclRow-"]').should('have.length', expectedCount);
  },

  verifyRoutingListTableColumns() {
    cy.expect(routingListSection.find(MultiColumnListHeader('Name')).exists());
    cy.expect(routingListSection.find(MultiColumnListHeader('Notes')).exists());
    cy.expect(routingListSection.find(MultiColumnListHeader('Users')).exists());
  },

  verifyRoutingListNamesClickable() {
    // Verify each routing list name is clickable (has link)
    cy.get(routingListContainer)
      .find('[class*="mclRow-"]')
      .each(($row) => {
        cy.wrap($row).find('a').should('exist');
      });
  },

  verifyAddRoutingListInactive() {
    // Open actions menu and verify "Add routing list" is inactive/disabled
    this.clickActionsButtonInRoutingList();

    cy.get('[class^=overlay-]')
      .find('[data-test-routing-list-button="true"]')
      .should('have.attr', 'disabled');
  },

  checkAssignedUsersInRoutingList(usernames = [], options = {}) {
    const { rowIndex = 0 } = options;

    // Always use index-based selection to avoid multiple element matching
    const targetRow = routingListSection.find(MultiColumnListRow({ index: rowIndex }));

    if (usernames.length === 0) {
      // Check for empty users column
      cy.expect(targetRow.find(MultiColumnListCell({ column: 'Users' })).has({ content: '' }));
      return;
    }

    // For single user, check directly
    if (usernames.length === 1) {
      cy.expect(
        targetRow
          .find(MultiColumnListCell({ column: 'Users' }))
          .has({ content: including(usernames[0]) }),
      );
      return;
    }

    // For multiple users, verify each username is present in the content
    usernames.forEach((username) => {
      cy.expect(
        targetRow
          .find(MultiColumnListCell({ column: 'Users' }))
          .has({ content: including(username) }),
      );
    });
  },

  createRoutingListViaApi(userIds, routingListName, polId) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'orders/routing-lists',
        body: {
          userIds,
          name: routingListName,
          poLineId: polId,
        },
      })
      .then((response) => {
        return response.body.id;
      });
  },
};
