import { TextField as TextFieldOriginal } from '@interactors/html';

import {
  Accordion,
  AcqFundDistribution,
  Button,
  Card,
  Checkbox,
  HTML,
  Popover,
  RepeatableField,
  RepeatableFieldItem,
  Selection,
  SelectionList,
  SelectionOption,
  TextField,
  including,
} from '../../../../interactors';
import {
  DEFAULT_WAIT_TIME,
  FUND_DISTRIBUTION_TYPES,
  ORDER_LINE_ACCORDION_NAMES,
  ORDER_LINE_FORM_LABELS,
} from '../../constants';
import { isFloat } from '../../utils/numberTools';
import OrderStates from './orderStates';

const FORM_FIELD_NAMES = {
  TOTAL_PRICE: 'paymentTerms.totalPrice',
  PREPAYMENT_TERM: 'paymentTerms.prepaymentTerm',
  STARTING_FISCAL_YEAR: 'paymentTerms.startingFiscalYearId',
};
const PAYMENT_TERMS_IDS = {
  SECTION: 'paymentTerms',
  FISCAL_YEAR_DISTRIBUTIONS: 'paymentTerms.fiscalYearDistributions',
};
const PAYMENT_TERMS_LABELS = {
  STARTING_FISCAL_YEAR: ORDER_LINE_FORM_LABELS.STARTING_FISCAL_YEAR,
  ADD_FISCAL_YEAR: ORDER_LINE_FORM_LABELS.ADD_FISCAL_YEAR,
  FUND_ID: ORDER_LINE_FORM_LABELS.FUND_ID,
  EXPENSE_CLASS: ORDER_LINE_FORM_LABELS.EXPENSE_CLASS,
  ADD_FUND_DISTRIBUTION: ORDER_LINE_FORM_LABELS.ADD_FUND_DISTRIBUTION,
};
const DISTRIBUTION_TYPES = {
  AMOUNT: '$',
  PERCENT: '%',
};
const DISTRIBUTION_TYPE_BUTTON_STATE = 'primary';
const DEFAULT_FORMATTED_AMOUNT = '$0.00';
const PAYMENT_TERMS_MESSAGES = {
  MULTI_YEAR_PREPAYMENT_INFO:
    'Select Multi-year prepayment if paying for orders over multiple fiscal years',
  PAYMENT_TERMS_INFO:
    'To enable the fields in the "Payment terms" accordion, select "Multi-year payment" in the "Ongoing order information" accordion',
  FISCAL_YEAR_INFO: 'Fiscal years must have been created for each year of prepayment',
  MINIMUM_FISCAL_YEARS: 'At least 2 fiscal years must be specified for multi-year prepayment',
  REMAINING_AMOUNT_PREFIX: 'Remaining amount to be distributed: ',
};
const FIELD_SELECTORS = {
  REPEATABLE_FIELD_LIST: '[data-test-repeatable-field-list]',
  FIELDSET: 'fieldset',
  REMOVE_FISCAL_YEAR_BUTTON: 'button[icon="trash"][aria-label="Remove fiscal year"]',
  PAYMENT_TERMS_ACCORDION_TOGGLE: 'button[id="accordion-toggle-button-paymentTerms"]',
  INFO_POPOVER_TRIGGER: '[data-test-info-popover-trigger]',
  EYE_BUTTON: 'button[icon="eye-open"], button[aria-label*="eye"]',
};
const BUTTON_ICONS = {
  INFO: 'info',
  EYE_OPEN: 'eye-open',
  TRASH: 'trash',
};

const paymentTermsSection = Accordion({ id: PAYMENT_TERMS_IDS.SECTION });
const multiYearPrepaymentCheckbox = Checkbox({
  labelText: ORDER_LINE_FORM_LABELS.MULTI_YEAR_PREPAYMENT,
});

const getFiscalYearDistributionItems = (element) => {
  const list = [...element.querySelectorAll(FIELD_SELECTORS.REPEATABLE_FIELD_LIST)].find(
    (candidate) => candidate.closest(FIELD_SELECTORS.FIELDSET) === element,
  );

  return list ? [...list.children] : [];
};

const assertSelectedDistributionType = (row, selectedType) => {
  cy.do(
    row.perform((element) => {
      const typeButtons = [...element.querySelectorAll('button')];

      Object.values(DISTRIBUTION_TYPES).forEach((type) => {
        const button = typeButtons.find((candidate) => candidate.textContent.trim() === type);

        expect(button, `${type} distribution type button`).to.not.equal(undefined);
        if (type === selectedType) {
          expect(button.className, `${type} distribution type is selected`).to.include(
            DISTRIBUTION_TYPE_BUTTON_STATE,
          );
        } else {
          expect(button.className, `${type} distribution type is not selected`).not.to.include(
            DISTRIBUTION_TYPE_BUTTON_STATE,
          );
        }
      });
    }),
  );
};

const fillFieldWithFloatValue = (fieldInteractor, value) => {
  return fieldInteractor.find(TextFieldOriginal()).perform((el) => {
    return cy.wrap(el).scrollIntoView().clear().type(value)
      .blur();
  });
};

const multiYearPaymentTerms = {
  assertPaymentTermsSectionAbsent() {
    cy.expect(paymentTermsSection.absent());
  },
  assertPaymentTermsSectionPresent() {
    cy.expect(paymentTermsSection.exists());
  },
  assertMultiYearPrepaymentUnchecked() {
    cy.expect(multiYearPrepaymentCheckbox.has({ checked: false }));
  },
  toggleMultiYearPrepayment() {
    cy.do(multiYearPrepaymentCheckbox.click());
  },
  assertMultiYearPrepaymentChecked() {
    cy.expect(multiYearPrepaymentCheckbox.has({ checked: true }));
  },
  assertMultiYearPrepaymentAbsent() {
    cy.expect(multiYearPrepaymentCheckbox.absent());
  },
  assertMultiYearPrepaymentCheckedAndEnabled() {
    cy.expect(multiYearPrepaymentCheckbox.has({ checked: true, disabled: false }));
  },
  assertMultiYearPrepaymentCheckedAndDisabled() {
    cy.expect(multiYearPrepaymentCheckbox.has({ checked: true, disabled: true }));
  },
  assertMultiYearPrepaymentEnabled() {
    cy.expect(multiYearPrepaymentCheckbox.has({ disabled: false }));
  },
  assertPaymentTermsExpanded() {
    cy.expect(paymentTermsSection.has({ open: true }));
  },
  assertPaymentTermsCollapsed() {
    cy.expect(paymentTermsSection.has({ expanded: false }));
  },
  assertPaymentTermsState(overrides = {}) {
    const {
      values: {
        prepaymentTerm: prepaymentTermValue = '',
        startingFiscalYear: startingFiscalYearValue = '',
        totalPrice: totalPriceValue = '0',
      } = {},
      disabled: {
        prepaymentTerm: prepaymentTermDisabled = true,
        startingFiscalYear: startingFiscalYearDisabled = false,
        totalPrice: totalPriceDisabled = false,
      } = {},
    } = overrides;

    cy.expect([
      paymentTermsSection
        .find(TextField({ name: FORM_FIELD_NAMES.TOTAL_PRICE }))
        .has({ value: totalPriceValue, disabled: totalPriceDisabled }),
      paymentTermsSection
        .find(TextField({ name: FORM_FIELD_NAMES.PREPAYMENT_TERM }))
        .has({ disabled: prepaymentTermDisabled, value: prepaymentTermValue }),
      paymentTermsSection
        .find(Selection({ name: FORM_FIELD_NAMES.STARTING_FISCAL_YEAR }))
        .has({ disabled: startingFiscalYearDisabled, singleValue: startingFiscalYearValue }),
    ]);
  },
  assertStartingFiscalYearValue(fyCode) {
    cy.expect(
      paymentTermsSection
        .find(Selection(including(PAYMENT_TERMS_LABELS.STARTING_FISCAL_YEAR)))
        .has({ singleValue: including(fyCode) }),
    );
  },
  scrollToPaymentTermsSection() {
    cy.get(`[id="paymentTerms"] ${FIELD_SELECTORS.PAYMENT_TERMS_ACCORDION_TOGGLE}`)
      .scrollIntoView()
      .should('be.visible')
      .focus();
    cy.wait(1000);
  },
  toggleStartingFiscalYearDropdown() {
    const selectionField = paymentTermsSection.find(
      Selection(including(PAYMENT_TERMS_LABELS.STARTING_FISCAL_YEAR)),
    );

    cy.do([selectionField.perform((el) => el.scrollIntoView()), selectionField.toggle()]);
  },
  assertFiscalYearOptionPresent(fyCode) {
    cy.expect(SelectionOption(including(fyCode)).exists());
  },
  assertFiscalYearOptionAbsent(fyCode) {
    cy.expect(SelectionOption(including(fyCode)).absent());
  },
  selectStartingFiscalYear(fyCode) {
    cy.do([
      paymentTermsSection.perform((el) => el.scrollIntoView()),
      paymentTermsSection
        .find(Selection(including(PAYMENT_TERMS_LABELS.STARTING_FISCAL_YEAR)))
        .open(),
      SelectionList().filter(fyCode),
      SelectionOption(including(fyCode)).click(),
    ]);
  },
  clearPrepaymentTotalPrice() {
    this.fillPrepaymentTotalPrice('');
  },
  fillPrepaymentTotalPrice(value) {
    const field = paymentTermsSection.find(TextField({ name: FORM_FIELD_NAMES.TOTAL_PRICE }));

    cy.do([
      field.perform((el) => el.scrollIntoView()),
      field.focus(),
      isFloat(value) ? fillFieldWithFloatValue(field, value) : field.fillIn(String(value)),
      field.blur(),
    ]);
  },
  assertPrepaymentTermValue(value) {
    cy.expect(
      paymentTermsSection
        .find(TextField({ name: FORM_FIELD_NAMES.PREPAYMENT_TERM }))
        .has({ value: String(value) }),
    );
  },
  clickAddFiscalYearButton() {
    cy.do(paymentTermsSection.find(Button(PAYMENT_TERMS_LABELS.ADD_FISCAL_YEAR)).click());
  },
  assertAddFiscalYearButtonEnabled() {
    cy.expect(
      paymentTermsSection
        .find(Button(PAYMENT_TERMS_LABELS.ADD_FISCAL_YEAR))
        .has({ disabled: false }),
    );
  },
  assertAddFiscalYearButtonDisabled() {
    cy.expect(
      paymentTermsSection
        .find(Button(PAYMENT_TERMS_LABELS.ADD_FISCAL_YEAR))
        .has({ disabled: true }),
    );
  },
  assertFiscalYearCards(fyCodes) {
    fyCodes.forEach((fyCode) => {
      cy.expect(paymentTermsSection.find(Card({ headerStart: including(fyCode) })).exists());
    });
  },
  assertOnlyFiscalYearCardRemovable(fyCodes, removableFyCode) {
    cy.do(
      paymentTermsSection
        .find(RepeatableField({ id: PAYMENT_TERMS_IDS.FISCAL_YEAR_DISTRIBUTIONS }))
        .perform((element) => {
          const items = getFiscalYearDistributionItems(element);

          expect(items).to.have.length(fyCodes.length);
          items.forEach((item, index) => {
            const removeButtons = item.querySelectorAll(FIELD_SELECTORS.REMOVE_FISCAL_YEAR_BUTTON);
            const expectedCount = fyCodes[index] === removableFyCode ? 1 : 0;

            expect(removeButtons).to.have.length(expectedCount);
          });
        }),
    );
  },
  assertFiscalYearCardFundDistributions({ fyCode, distributions }, { required = true } = {}) {
    const fundDistribution = paymentTermsSection
      .find(Card({ headerStart: including(fyCode) }))
      .find(AcqFundDistribution());

    cy.expect(fundDistribution.has({ rowCount: distributions.length }));

    distributions.forEach(
      ({ fundName, fundCode, expenseClassName, value, distributionType }, index) => {
        const row = fundDistribution.find(RepeatableFieldItem({ index }));
        const expectations = [
          row
            .find(Selection(including(PAYMENT_TERMS_LABELS.FUND_ID)))
            .has({ singleValue: including(`${fundName} (${fundCode})`) }),
          row.find(TextField()).has({ value: String(value), required }),
        ];

        if (expenseClassName) {
          expectations.push(
            row.find(Selection(including(PAYMENT_TERMS_LABELS.EXPENSE_CLASS))).has({
              singleValue: including(expenseClassName),
            }),
          );
        }

        cy.expect(expectations);

        if (distributionType) {
          const labelsMap = {
            [FUND_DISTRIBUTION_TYPES.AMOUNT]: '$',
            [FUND_DISTRIBUTION_TYPES.PERCENTAGE]: '%',
          };

          cy.do(
            row.perform((el) => {
              const fdTypeLabel = el.querySelector(
                '[data-test-fund-distr-type] button[class*="primary-"]',
              ).textContent;

              cy.wrap(fdTypeLabel).should('eq', labelsMap[distributionType]);
            }),
          );
        }
      },
    );
  },
  assertExpenseClassFieldPresentInFYCard(fyCode) {
    cy.expect(
      paymentTermsSection
        .find(Card({ headerStart: including(fyCode) }))
        .find(Selection(including(PAYMENT_TERMS_LABELS.EXPENSE_CLASS)))
        .exists(),
    );
  },
  removeFundDistributionInFYCard({ fyCode, rowIndex = 0 }) {
    cy.do(
      paymentTermsSection
        .find(Card({ headerStart: including(fyCode) }))
        .find(AcqFundDistribution())
        .removeRow(rowIndex),
    );
  },
  assertFundDistributionAbsentInFYCard(fyCode) {
    const fundDistribution = paymentTermsSection
      .find(Card({ headerStart: including(fyCode) }))
      .find(AcqFundDistribution());

    cy.expect([
      fundDistribution.has({ rowCount: 0 }),
      fundDistribution.find(Button(PAYMENT_TERMS_LABELS.ADD_FUND_DISTRIBUTION)).has({
        disabled: false,
      }),
    ]);
  },
  assertEmptyFundDistributionRow({
    fyCode,
    rowIndex = 0,
    formattedAmount = DEFAULT_FORMATTED_AMOUNT,
  }) {
    const row = paymentTermsSection
      .find(Card({ headerStart: including(fyCode) }))
      .find(AcqFundDistribution())
      .find(RepeatableFieldItem({ index: rowIndex }));

    cy.expect([
      row.find(Selection(including(PAYMENT_TERMS_LABELS.FUND_ID))).exists(),
      row.find(TextField()).has({ required: false, value: '0' }),
      row.find(Button(DISTRIBUTION_TYPES.AMOUNT)).exists(),
      row.find(Button(DISTRIBUTION_TYPES.PERCENT)).exists(),
      row.find(Button({ icon: BUTTON_ICONS.TRASH })).exists(),
      row.has({ text: including(formattedAmount) }),
    ]);

    // The segmented Type control exposes its selected option through the primary button style.
    assertSelectedDistributionType(row, DISTRIBUTION_TYPES.AMOUNT);
  },
  addFundDistributionInFYCard(fyCode) {
    cy.do(
      paymentTermsSection
        .find(Card({ headerStart: including(fyCode) }))
        .find(AcqFundDistribution())
        .addRow(),
    );
  },
  openFundSelectorInPaymentTermsCard({ fyCode, rowIndex = 0 }) {
    const fundDistribution = paymentTermsSection
      .find(Card({ headerStart: including(fyCode) }))
      .find(AcqFundDistribution());

    cy.do([
      fundDistribution.perform((el) => el.scrollIntoView()),
      fundDistribution.openFundSelector(rowIndex),
    ]);
  },
  closeSelectionList() {
    // Fund options are rendered in a portal. Clicking the owning payment-terms section closes
    // the list without selecting an option or changing the current fund distribution.
    cy.do(paymentTermsSection.click());
    cy.expect(SelectionList().absent());
  },
  selectFundInPaymentTermsCard({ fyCode, fundName, fundCode, rowIndex = 0 }) {
    const label = `${fundName} (${fundCode})`;

    this.openFundSelectorInPaymentTermsCard({ fyCode, rowIndex });
    cy.do([SelectionList().filter(label), SelectionOption(including(label)).click()]);
    cy.wait(DEFAULT_WAIT_TIME / 4);
  },
  selectExpenseClassInFYCard({ fyCode, expenseClassName, rowIndex = 0 }) {
    const distributionInteractor = paymentTermsSection
      .find(Card({ headerStart: including(fyCode) }))
      .find(AcqFundDistribution());

    cy.do([
      distributionInteractor.perform((el) => el.scrollIntoView()),
      distributionInteractor.openExpenseClassSelector(rowIndex),
      SelectionOption(including(expenseClassName)).click(),
    ]);
  },
  selectDistributionTypePercentInFYCard({ fyCode, rowIndex = 0 }) {
    cy.do(
      paymentTermsSection
        .find(Card({ headerStart: including(fyCode) }))
        .find(AcqFundDistribution())
        .selectDistributionTypePercent(rowIndex),
    );
  },
  selectDistributionTypeAmountInFYCard({ fyCode, rowIndex = 0 }) {
    cy.do(
      paymentTermsSection
        .find(Card({ headerStart: including(fyCode) }))
        .find(AcqFundDistribution())
        .selectDistributionTypeAmount(rowIndex),
    );
  },
  assertDistributionTypePercentInFYCard({ fyCode, rowIndex = 0 }) {
    const row = paymentTermsSection
      .find(Card({ headerStart: including(fyCode) }))
      .find(AcqFundDistribution())
      .find(RepeatableFieldItem({ index: rowIndex }));

    assertSelectedDistributionType(row, DISTRIBUTION_TYPES.PERCENT);
  },
  fillFundDistributionValueInFYCard({ fyCode, value, rowIndex = 0 }) {
    const fieldValue = paymentTermsSection
      .find(Card({ headerStart: including(fyCode) }))
      .find(AcqFundDistribution());

    cy.do([
      fieldValue.focusValueField({ index: rowIndex }),
      isFloat(value)
        ? fillFieldWithFloatValue(
          fieldValue.find(RepeatableFieldItem({ index: rowIndex })).find(TextField()),
          value,
        )
        : fieldValue.fillValue({ value, index: rowIndex }),
      fieldValue.blurValueField({ index: rowIndex }),
    ]);
    cy.wait(DEFAULT_WAIT_TIME / 4);
  },
  assertPaymentTermsRemainingAmount(remainingAmount) {
    cy.expect(
      paymentTermsSection.has({
        text: including(OrderStates.remainingAmountToBeDistributed(remainingAmount)),
      }),
    );
  },
  assertPrepaymentTermsRemainingAmount(value) {
    cy.expect(
      paymentTermsSection
        .find(HTML(`${PAYMENT_TERMS_MESSAGES.REMAINING_AMOUNT_PREFIX}${value}`))
        .exists(),
    );
  },
  assertPaymentTermsMixTypesOfZeroPriceValidationError() {
    cy.expect(
      paymentTermsSection.has({ text: including(OrderStates.fundDistributionTypesMixOfZeroPrice) }),
    );
  },
  assertPaymentTermsPercentageValidationError() {
    cy.expect(
      paymentTermsSection.has({ text: including(OrderStates.percentageAmountShouldBeEqual) }),
    );
  },
  assertMultipleDistributionsSameFundError() {
    cy.expect(HTML(including(OrderStates.multipleDistributionsSameFund)).exists());
  },
  assertAtLeastTwoFYsValidationError() {
    cy.expect(HTML(including(PAYMENT_TERMS_MESSAGES.MINIMUM_FISCAL_YEARS)).exists());
  },
  assertPrepaymentTermsDistributionError(value) {
    cy.expect(
      paymentTermsSection.find(HTML(including(OrderStates.percentageAmountShouldBeEqual))).exists(),
    );
    this.assertPrepaymentTermsRemainingAmount(value);
  },
  assertPaymentTermsTotalPriceValidationError(error) {
    paymentTermsSection.find(TextField({ name: FORM_FIELD_NAMES.TOTAL_PRICE })).has({ error });
  },
  assertPaymentTermsPrepaymentTermValidationError(error) {
    paymentTermsSection.find(TextField({ name: FORM_FIELD_NAMES.PREPAYMENT_TERM })).has({ error });
  },
  assertPaymentTermsStartingFiscalYearValidationError(error) {
    paymentTermsSection
      .find(Selection({ name: FORM_FIELD_NAMES.STARTING_FISCAL_YEAR }))
      .has({ error });
  },
  removeLastFYCard() {
    cy.do(
      paymentTermsSection
        .find(RepeatableField({ id: PAYMENT_TERMS_IDS.FISCAL_YEAR_DISTRIBUTIONS }))
        .perform((element) => {
          const items = getFiscalYearDistributionItems(element);
          const lastItem = items.at(-1);
          const removeButton = lastItem?.querySelector(FIELD_SELECTORS.REMOVE_FISCAL_YEAR_BUTTON);

          expect(removeButton, 'last fiscal-year card remove button').to.not.equal(null);
          removeButton.click();
        }),
    );
  },
  clickMultiYearPrepaymentInfoIcon() {
    cy.get('[name="multiYearPayment"]')
      .closest('[class*="col-"]')
      .find(FIELD_SELECTORS.INFO_POPOVER_TRIGGER)
      .first()
      .click();
  },
  verifyMultiYearPrepaymentInfoPopover() {
    cy.expect(
      Popover().has({
        content: including(PAYMENT_TERMS_MESSAGES.MULTI_YEAR_PREPAYMENT_INFO),
      }),
    );
  },
  clickPaymentTermsInfoIcon() {
    cy.get('section[id="paymentTerms"]')
      .contains(ORDER_LINE_ACCORDION_NAMES.PAYMENT_TERMS)
      .find(FIELD_SELECTORS.INFO_POPOVER_TRIGGER)
      .first()
      .click();
  },
  verifyPaymentTermsInfoPopover() {
    cy.expect(
      Popover().has({
        content: including(PAYMENT_TERMS_MESSAGES.PAYMENT_TERMS_INFO),
      }),
    );
  },
  clickStartingFiscalYearInfoIcon() {
    cy.get('section[id="paymentTerms"]')
      .contains('label', PAYMENT_TERMS_LABELS.STARTING_FISCAL_YEAR)
      .closest('[class*="col-"]')
      .find(FIELD_SELECTORS.INFO_POPOVER_TRIGGER)
      .first()
      .click();
  },
  verifyStartingFiscalYearInfoPopover() {
    cy.expect(
      Popover().has({
        content: including(PAYMENT_TERMS_MESSAGES.FISCAL_YEAR_INFO),
      }),
    );
  },
};

export default multiYearPaymentTerms;
