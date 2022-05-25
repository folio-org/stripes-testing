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

describe("ui-circulation-settings: create and recieve patron notice", () => {
  beforeEach("login", () => {
    const patronNoticeTemplate = {
      ...NewPatronNoticeTemplate.defaultUiPatronNoticeTemplate,
    };
    const patronNoticePolicy = {
      ...NewPatronNoticePolicies.defaultUiPatronNoticePolicies,
    };
    const patronGropup = {
      ...PatronGroups.defaultPatronGroup,
    }

    cy.getAdminToken();
    MaterialTypes.createApi();
    LoanPolicy.createApi();
    RequestPolicy.createApi();
    LostItemFeePolicy.createApi();
    OverdueFinePolicy.createApi();
    PatronGroups.createViaApi(patronGropup)

    // send patron group
    // send circulation rule
    // materialTypeName: defaultMaterialType.name,
    // loanPolicyName: defaultLoanPolicy.name,
    // overdueFinePolicyName: defaultOverdueFinePolicy.name,
    // lostItemFeePolicyName: defaultLostItemFeePolicy.name,
    // requestPolicyName: defaultRequestPolicy.name,
    // noticePolicyName: defaultNoticePolicy.name,

    cy.login(Cypress.env("diku_login"), Cypress.env("diku_password"));
  });

  it(
    'C347621 Check that user can receive notice with multiple items after finishing the session "Check out" by clicking the End Session button.',
    { tags: [TestType.smoke] },
    () => {
      cy.visit(`${SettingsMenu.circulationPatronNoticeTemplatesPath}`);

      NewPatronNoticeTemplate.createTemplate(patronNoticeTemplate);
      NewPatronNoticeTemplate.checkTemplate(patronNoticeTemplate);
      patronNoticePolicy.template = patronNoticeTemplate.name
      NewPatronNoticePolicies.getNotice(
        patronNoticePolicy,
        "template",
        "format",
        "action"
      );
      patronNoticePolicy.template = patronNoticeTemplate.name;
      patronNoticePolicy.format = "Email";
      patronNoticePolicy.action = "Check out";
      patronNoticePolicy.action = 'Check out'
      cy.visit(`${SettingsMenu.circulationPatronNoticePoliciesPath}`);
      NewPatronNoticePolicies.createPolicy(patronNoticePolicy);
      NewPatronNoticePolicies.addNotice(patronNoticePolicy);

      cy.visit(TopMenu.circulationLogPath);

      cy.log('blablabla')
      // test in UI
    }
  );

  afterEach(() => {
    NewPatronNoticeTemplate.deleteTemplate();
    NewPatronNoticePolicies.deletePolicy();
    MaterialTypes.deleteApi(defaultMaterialType.id);
    LoanPolicy.deleteApi(defaultLoanPolicy.id);
    RequestPolicy.deleteApi(defaultRequestPolicy.id);
    LostItemFeePolicy.deleteApi(defaultLostItemFeePolicy.id);
    OverdueFinePolicy.deleteApi(defaultOverdueFinePolicy.id);
  });
});
