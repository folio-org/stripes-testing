import uuid from 'uuid';
import generateItemBarcode from '../../support/utils/generateItemBarcode';
import getRandomPostfix from '../../support/utils/stringTools';

import TestTypes from '../../support/dictionary/testTypes';
import TopMenu from '../../support/fragments/topMenu';
import settingsMenu from '../../support/fragments/settingsMenu';

import loanPolicy, {
  defaultLoanPolicy,
} from '../../support/fragments/circulation/loan-policy';
import lostItemFeePolicy, {
  defaultLostItemFeePolicy,
} from '../../support/fragments/circulation/lost-item-fee-policy';
import newPatronNoticePolicies from '../../support/fragments/circulation/newPatronNoticePolicies';
import NewPatronNoticeTemplate from '../../support/fragments/circulation/newPatronNoticeTemplate';
import overdueFinePolicy, {
  defaultOverdueFinePolicy,
} from '../../support/fragments/circulation/overdue-fine-policy';
import requestPolicy, {
  defaultRequestPolicy,
} from '../../support/fragments/circulation/request-policy';
import materialTypesSettings, {
  defaultMaterialType,
} from '../../support/fragments/inventory/materialType/materialTypesSettings';
import patronGroups from '../../support/fragments/settings/users/patronGroups';
import circulationRules from '../../support/fragments/circulation/circulation-rules';
import checkoutActions from '../../support/fragments/check-out-actions/check-out-actions';
import SearchPane from '../../support/fragments/circulation-log/searchPane';

// TODO: Add recieving notice in the email box check
describe('Recieving notice: Checkout', { tags: [TestTypes.smoke] }, () => {
  let patronGroupId;
  let userLastName;

  const testPatronGroup = patronGroups.defaultPatronGroup;
  const testPatronNoticeTemplate = NewPatronNoticeTemplate.defaultUiPatronNoticeTemplate;
  const testPatronNotice = newPatronNoticePolicies.defaultUiPatronNoticePolicies;
  const USER_BARCODE = uuid();
  const ITEM_BARCODE = generateItemBarcode();

  beforeEach(() => {
    cy.getAdminToken()
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        cy.getHoldingSources({ limit: 1 });
        cy.getInstanceTypes({ limit: 1 });
        cy.getUserGroups({ limit: 1 }).then((patronGroups) => {
          patronGroupId = patronGroups;
        });
      })
      .then(() => {
        cy.createUserApi({
          active: true,
          barcode: USER_BARCODE,
          personal: {
            preferredContactTypeId: '002',
            lastName: `Test user ${getRandomPostfix()}`,
            email: 'test@folio.org',
          },
          patronGroup: patronGroupId,
          departments: [],
        }).then((user) => {
          userLastName = user.personal.lastname
        });

        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env('instanceTypes')[0].id,
            title: `Automation test instance ${getRandomPostfix()}`,
          },
          holdings: [
            {
              holdingsTypeId: Cypress.env('holdingsTypes')[0].id,
              permanentLocationId: Cypress.env('locations')[0].id,
              sourceId: Cypress.env('holdingSources')[0].id,
            },
          ],
          items: [
            [
              {
                barcode: ITEM_BARCODE,
                status: { name: 'Available' },
                permanentLoanType: { id: Cypress.env('loanTypes')[0].id },
                materialType: { id: Cypress.env('materialTypes')[0].id },
              },
            ],
          ],
        });
      });

    materialTypesSettings.createApi();
    loanPolicy.createApi();
    requestPolicy.createApi();
    lostItemFeePolicy.createApi();
    overdueFinePolicy.createApi();
    patronGroups.createViaApi(testPatronGroup);
    cy.loginAsAdmin({
      path: settingsMenu.circulationPatronNoticeTemplatesPath,
      waiter: NewPatronNoticeTemplate.waitLoading,
    });

    NewPatronNoticeTemplate.createTemplate(testPatronNoticeTemplate);
    NewPatronNoticeTemplate.checkTemplate(testPatronNoticeTemplate);
    cy.visit(settingsMenu.circulationPatronNoticePoliciesPath);
    newPatronNoticePolicies.createPolicy(testPatronNotice);
    newPatronNoticePolicies.savePolicy();
    testPatronNotice.templateId = testPatronNoticeTemplate.name;
    testPatronNotice.format = 'Email';
    testPatronNotice.action = 'Check out';
    newPatronNoticePolicies.addNotice(testPatronNotice);
    newPatronNoticePolicies.savePolicy();
    newPatronNoticePolicies.checkPolicy(testPatronNotice.name);
  });

  it('C347621 Check that user can receive notice with multiple items after finishing the session "Check out" by clicking the End Session button', () => {
    cy.visit(settingsMenu.circulationRulesPath);
    circulationRules.clearCirculationRules();
    circulationRules.fillInPriority();
    circulationRules.fillInFallbackPolicy({
      loanPolicyName: defaultLoanPolicy.name,
      overdueFinePolicyName: defaultOverdueFinePolicy.name,
      lostItemFeePolicyName: defaultLostItemFeePolicy.name,
      requestPolicyName: defaultRequestPolicy.name,
      noticePolicyName: testPatronNotice.name,
      materialTypeName: defaultMaterialType.name,
    });
    circulationRules.fillInPolicy({
      priorityType: 'g ',
      priorityTypeName: testPatronGroup.group,
      loanPolicyName: defaultLoanPolicy.name,
      overdueFinePolicyName: defaultOverdueFinePolicy.name,
      lostItemFeePolicyName: defaultLostItemFeePolicy.name,
      requestPolicyName: defaultRequestPolicy.name,
      noticePolicyName: testPatronNotice.name,
    });
    circulationRules.saveCirculationRules();
    cy.visit(TopMenu.checkOutPath);
    checkoutActions.checkOutItem(USER_BARCODE, ITEM_BARCODE);
    cy.visit(TopMenu.circulationLogPath);
    SearchPane.searchByUserBarcode(USER_BARCODE);
    SearchPane.verifyResultCells();
  });

  after(() => {
    cy.visit(settingsMenu.circulationRulesPath);
    circulationRules.clearCirculationRules();
    circulationRules.fillInPriority();
    circulationRules.fillInFallbackPolicy({
      loanPolicyName: 'example-loan-policy',
      overdueFinePolicyName: 'overdue-fine-policy',
      lostItemFeePolicyName: 'lost-item-fee-policy ',
      requestPolicyName: 'allow-all',
      noticePolicyName: 'send-no-notices',
    });
    circulationRules.fillInPolicy({
      priorityType: 'm ',
      priorityTypeName: 'book',
      loanPolicyName: 'one-hour',
      overdueFinePolicyName: 'overdue-fine-policy',
      lostItemFeePolicyName: 'lost-item-fee-policy',
      requestPolicyName: 'allow-all',
      noticePolicyName: 'send-no-notices',
    });
    circulationRules.saveCirculationRules();
    cy.getUsers({ query: `personal.lastName='${userLastName}'` }).then(() => {
      Cypress.env('users').forEach((user) => {
        cy.deleteUser(user.id);
      });
    });
    cy.getInstance({
      limit: 1,
      expandAll: true,
      query: `'items.barcode'=='${ITEM_BARCODE}'`,
    }).then((instance) => {
      cy.deleteItem(instance.items[0].id);
      cy.deleteHoldingRecord(instance.holdings[0].id);
      cy.deleteInstanceApi(instance.id);
    });
    materialTypesSettings.deleteApi(defaultMaterialType.id);
    loanPolicy.deleteApi(defaultLoanPolicy.id);
    requestPolicy.deleteApi(defaultRequestPolicy.id);
    lostItemFeePolicy.deleteApi(defaultLostItemFeePolicy.id);
    overdueFinePolicy.deleteApi(defaultOverdueFinePolicy.id);
    patronGroups.deleteViaApi(Cypress.env('patronGroupId'));
    cy.visit(settingsMenu.circulationPatronNoticePoliciesPath);
    newPatronNoticePolicies.openNoticyToSide(testPatronNotice);
    newPatronNoticePolicies.deletePolicy();
    cy.visit(settingsMenu.circulationPatronNoticeTemplatesPath);
    NewPatronNoticeTemplate.openTemplateToSide(testPatronNoticeTemplate);
    NewPatronNoticeTemplate.deleteTemplate();
  });
});
