import NewPatronNoticeTemplate from "../../../../support/fragments/circulation/newPatronNoticeTemplate";
import TopMenu from "../../../../support/fragments/topMenu";
import SettingsMenu from "../../../../support/fragments/settingsMenu";
import TestType from "../../../../support/dictionary/testTypes";
import NewPatronNoticePolicies from "../../../../support/fragments/circulation/newPatronNoticePolicies";
import OverdueFinePolicy, {
  defaultOverdueFinePolicy,
} from "../../../../support/fragments/circulation/overdue-fine-policy";
import LostItemFeePolicy, {
  defaultLostItemFeePolicy,
} from "../../../../support/fragments/circulation/lost-item-fee-policy";
import RequestPolicy, {
  defaultRequestPolicy,
} from "../../../../support/fragments/circulation/request-policy";
import LoanPolicy, {
  defaultLoanPolicy,
} from "../../../../support/fragments/circulation/loan-policy";
import MaterialTypes, {
  defaultMaterialType,
} from "../../../../support/fragments/inventory/materialType/materialTypesSettings";
import PatronGroups from "../../../../support/fragments/settings/users/patronGroups";
import CirculationRules from "../../../../support/fragments/circulation/circulation-rules";
import NoticePolicy, {
  defaultNoticePolicy,
} from "../../../../support/fragments/circulation/notice-policy";
import generateItemBarcode from "../../../../support/utils/generateItemBarcode";
import {
  checkOutItem,
  overrideLoanPolicy,
} from "../../../../support/fragments/check-out-actions/check-out-actions";
import SearchPane from '../../../../support/fragments/circulation-log/searchPane';

describe("ui-circulation-settings: create and recieve patron notice", () => {
  let ITEM_BARCODE;

  beforeEach("login", () => {
    ITEM_BARCODE = generateItemBarcode();
    cy.getAdminToken();
    MaterialTypes.createApi();
    LoanPolicy.createApi();
    RequestPolicy.createApi();
    LostItemFeePolicy.createApi();
    OverdueFinePolicy.createApi();
    NoticePolicy.createApi();

    // send patron group
    // add admin in this patron group

    cy.login(Cypress.env("diku_login"), Cypress.env("diku_password"));

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
          holdings: [
            {
              holdingsTypeId: Cypress.env("holdingsTypes")[0].id,
              permanentLocationId: Cypress.env("locations")[0].id,
              sourceId: Cypress.env("holdingSources")[0].id,
            },
          ],
          items: [
            [
              {
                barcode: ITEM_BARCODE,
                missingPieces: "3",
                numberOfMissingPieces: "3",
                status: { name: "Available" },
                permanentLoanType: { id: Cypress.env("loanTypes")[0].id },
                materialType: { id: Cypress.env("materialTypes")[0].id },
              },
            ],
          ],
        });
      });

    cy.visit(`${SettingsMenu.circulationPatronNoticeTemplatesPath}`);
  });

  it(
    'C347621 Check that user can receive notice with multiple items after finishing the session "Check out" by clicking the End Session button.',
    { tags: [TestType.smoke] },
    () => {
      const patronNoticeTemplate = {
        ...NewPatronNoticeTemplate.defaultUiPatronNoticeTemplate,
      };
      const patronNoticePolicy = {
        ...NewPatronNoticePolicies.defaultUiPatronNoticePolicies,
      };

      const patronGropup = {
        ...PatronGroups.defaultPatronGroup,
      };
      PatronGroups.createViaApi(patronGropup);

      NewPatronNoticeTemplate.createTemplate(patronNoticeTemplate);
      NewPatronNoticeTemplate.checkTemplate(patronNoticeTemplate);
      patronNoticePolicy.templateId = patronNoticeTemplate.name;
      patronNoticePolicy.format = "Email";
      patronNoticePolicy.action = "Check out";
      NewPatronNoticePolicies.getPatronNoticePolicyTemplate(
        patronNoticePolicy,
        "template",
        "format",
        "action"
      );

      cy.visit(`${SettingsMenu.circulationPatronNoticePoliciesPath}`);
      NewPatronNoticePolicies.createPolicy(patronNoticePolicy);
      NewPatronNoticePolicies.addNotice(patronNoticePolicy);
      NewPatronNoticePolicies.savePolicy();

      cy.visit(SettingsMenu.circulationRulesPath);
      const rule = {
        priority: "g ",
        priorityTypeName: patronGropup.group,
        loanPolicyName: defaultLoanPolicy.name,
        overdueFinePolicyName: defaultOverdueFinePolicy.name,
        lostItemFeePolicyName: defaultLostItemFeePolicy.name,
        requestPolicyName: defaultRequestPolicy.name,
        noticePolicyName: patronNoticePolicy.name,
      };
      console.log("bla " + rule.loanPolicyName);
      CirculationRules.clearCirculationRules();
      CirculationRules.fillInPriority();
      CirculationRules.fillInFallbackPolicy({
        loanPolicyName: defaultLoanPolicy.name,
        overdueFinePolicyName: defaultOverdueFinePolicy.name,
        lostItemFeePolicyName: defaultLostItemFeePolicy.name,
        requestPolicyName: defaultRequestPolicy.name,
        noticePolicyName: defaultNoticePolicy.name,
      });
      CirculationRules.fillInPolicy(rule);
      CirculationRules.saveCirculationRules();
      CirculationRules.checkUpdateCirculationRulesCalloutAppeared();
      // check added rule
      // CirculationRules.checkNoticePolicyAddedToCirculationRules(
      //   patronNoticePolicy.id
      // );

      //check out item and user
      cy.visit("/checkout");

      checkOutItem(Cypress.env("users")[0].barcode, ITEM_BARCODE);
      overrideLoanPolicy();
      cy.wait(50000)
      // cy.verifyItemCheckOut();

      cy.visit(TopMenu.circulationLogPath);

      const userBarcode = Cypress.env('users')[0].barcode;
      SearchPane.searchByUserBarcode(userBarcode);
      SearchPane.verifyResultCells();
      cy.log("blablabla");
      // test in UI
    }
  );

  afterEach(() => {
    // NewPatronNoticeTemplate.deleteTemplate();
    // NewPatronNoticePolicies.deletePolicy();
    // MaterialTypes.deleteApi(defaultMaterialType.id);
    // LoanPolicy.deleteApi(defaultLoanPolicy.id);
    // RequestPolicy.deleteApi(defaultRequestPolicy.id);
    // LostItemFeePolicy.deleteApi(defaultLostItemFeePolicy.id);
    // OverdueFinePolicy.deleteApi(defaultOverdueFinePolicy.id);
  });
});
