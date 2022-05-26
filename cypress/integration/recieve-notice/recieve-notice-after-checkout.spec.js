import loanPolicy, { defaultLoanPolicy } from "../../support/fragments/circulation/loan-policy";
import lostItemFeePolicy, { defaultLostItemFeePolicy } from "../../support/fragments/circulation/lost-item-fee-policy";
import newPatronNoticePolicies from "../../support/fragments/circulation/newPatronNoticePolicies";
import newPatronNoticeTemplate from "../../support/fragments/circulation/newPatronNoticeTemplate";
import overdueFinePolicy, { defaultOverdueFinePolicy } from "../../support/fragments/circulation/overdue-fine-policy";
import requestPolicy, { defaultRequestPolicy } from "../../support/fragments/circulation/request-policy";
import materialTypesSettings, { defaultMaterialType } from "../../support/fragments/inventory/materialType/materialTypesSettings"
import patronGroups from "../../support/fragments/settings/users/patronGroups";
import generateItemBarcode from "../../support/utils/generateItemBarcode";
import circulationRules from "../../support/fragments/circulation/circulation-rules";
import settingsMenu from "../../support/fragments/settingsMenu";
import { checkOutItem, overrideLoanPolicy } from "../../support/fragments/check-out-actions/check-out-actions";
import SearchPane from "../../support/fragments/circulation-log/searchPane";
import TopMenu from "../../support/fragments/topMenu";

describe("test name", () => {
  const testPatronGroup = patronGroups.defaultPatronGroup
  const testPatronNoticeTemplate = newPatronNoticeTemplate.defaultUiPatronNoticeTemplate
  const testPatronNotice = newPatronNoticePolicies.defaultUiPatronNoticePolicies
  let ITEM_BARCODE

  beforeEach(() => {
    ITEM_BARCODE = generateItemBarcode();

    cy.getAdminToken()
      .then(() => {
        cy.getLoanTypes({ limit: 1 });
        cy.getMaterialTypes({ limit: 1 });
        cy.getLocations({ limit: 1 });
        cy.getHoldingTypes({ limit: 1 });
        cy.getHoldingSources({ limit: 1 });
        cy.getInstanceTypes({ limit: 1 });
        cy.getUsers({
          limit: 1,
          query: '"personal.firstName"="checkin-all" and "active"="true"',
        });
      })
      .then(() => {
        cy.getUserServicePoints(Cypress.env("users")[0].id);

        cy.createInstance({
          instance: {
            instanceTypeId: Cypress.env("instanceTypes")[0].id,
            title: `Pre-checkout instance ${Number(new Date())}`,
          },
          holdings: [{
              holdingsTypeId: Cypress.env("holdingsTypes")[0].id,
              permanentLocationId: Cypress.env("locations")[0].id,
              sourceId: Cypress.env("holdingSources")[0].id,
            }],
          items: [[{
                barcode: ITEM_BARCODE,
                missingPieces: "3",
                numberOfMissingPieces: "3",
                status: { name: "Available" },
                permanentLoanType: { id: Cypress.env("loanTypes")[0].id },
                materialType: { id: Cypress.env("materialTypes")[0].id },
              }]],
        });
      });
    materialTypesSettings.createApi()
    loanPolicy.createApi()
    requestPolicy.createApi()
    lostItemFeePolicy.createApi()
    overdueFinePolicy.createApi()
    patronGroups.createViaApi(testPatronGroup)
    cy.login(Cypress.env("diku_login"), Cypress.env("diku_password"));
    cy.visit(settingsMenu.circulationPatronNoticeTemplatesPath)
    newPatronNoticeTemplate.createTemplate(testPatronNoticeTemplate)
    newPatronNoticeTemplate.checkTemplate(testPatronNoticeTemplate)
    cy.visit(settingsMenu.circulationPatronNoticePoliciesPath)
    newPatronNoticePolicies.createPolicy(testPatronNotice)
    newPatronNoticePolicies.savePolicy()
    testPatronNotice.templateId = testPatronNoticeTemplate.name
    testPatronNotice.format = 'Email'
    testPatronNotice.action = 'Check out'
    newPatronNoticePolicies.addNotice(testPatronNotice)
    newPatronNoticePolicies.savePolicy()
    newPatronNoticePolicies.checkPolicy(testPatronNotice.name)
  });

  it("test", () => {
      cy.visit(settingsMenu.circulationRulesPath)
      circulationRules.clearCirculationRules()
      circulationRules.fillInPriority()
      circulationRules.fillInFallbackPolicy({
        loanPolicyName: defaultLoanPolicy.name,
        overdueFinePolicyName: defaultOverdueFinePolicy.name,
        lostItemFeePolicyName: defaultLostItemFeePolicy.name,
        requestPolicyName: defaultRequestPolicy.name,
        noticePolicyName: testPatronNotice.name,
        materialTypeName: defaultMaterialType.name
      });
      
      circulationRules.fillInPolicy({
        priorityType: 'g ',
        priorityTypeName: testPatronGroup.group,
        loanPolicyName: defaultLoanPolicy.name,
        overdueFinePolicyName: defaultOverdueFinePolicy.name,
        lostItemFeePolicyName: defaultLostItemFeePolicy.name,
        requestPolicyName: defaultRequestPolicy.name,
        noticePolicyName: testPatronNotice.name
      });
  
      circulationRules.saveCirculationRules();

      
      cy.visit("/checkout");
      checkOutItem(Cypress.env("users")[0].barcode, ITEM_BARCODE);

      cy.visit(TopMenu.circulationLogPath);
      const userBarcode = Cypress.env("users")[0].barcode;
      SearchPane.searchByUserBarcode(userBarcode);
      SearchPane.verifyResultCells();
  });

  afterEach(() => {
    cy.visit(settingsMenu.circulationRulesPath)
    circulationRules.clearCirculationRules()
    circulationRules.fillInPriority()
    circulationRules.fillInFallbackPolicy({
      loanPolicyName:'example-loan-policy',
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

    materialTypesSettings.deleteApi(defaultMaterialType.id)
    loanPolicy.deleteApi(defaultLoanPolicy.id)
    requestPolicy.deleteApi(defaultRequestPolicy.id)
    lostItemFeePolicy.deleteApi(defaultLostItemFeePolicy.id)
    overdueFinePolicy.deleteApi(defaultOverdueFinePolicy.id)
    patronGroups.deleteViaApi(Cypress.env('patronGroupId'))
    cy.visit(settingsMenu.circulationPatronNoticePoliciesPath)
    newPatronNoticePolicies.openNoticyToSide(testPatronNotice)
    newPatronNoticePolicies.deletePolicy()
    cy.visit(settingsMenu.circulationPatronNoticeTemplatesPath)
    newPatronNoticeTemplate.openTemplateToSide(testPatronNoticeTemplate)
    newPatronNoticeTemplate.deleteTemplate()
});
});
