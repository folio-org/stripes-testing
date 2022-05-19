import {
  REQUEST_POLICY_NAMES,
  NOTICE_POLICY_NAMES,
  OVERDUE_FINE_POLICY_NAMES,
  CY_ENV,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  LIBRARY_DUE_DATE_MANAGMENT,
  LOAN_PROFILE,
  LOST_ITEM_FEES_POLICY_NAMES,
} from '../../../constants';

let requestPolicyId;
let noticePolicyId;
let overdueFinePolicyId;
let lostItemFeesPolicyId;
let createdLoanPolicy;
let rulesDefaultString;

export default {
  createLoanPolicy:(itemQuantity) => {
    cy.createLoanPolicy({
      loanable: true,
      renewable: true,
      loansPolicy: {
        profileId: LOAN_PROFILE.FIXED,
        closedLibraryDueDateManagementId: LIBRARY_DUE_DATE_MANAGMENT.CURRENT_DUE_DATE,
        itemLimit: itemQuantity
      },
      renewalsPolicy: {
        numberAllowed: 2.0,
        renewFromId: LIBRARY_DUE_DATE_MANAGMENT.CURRENT_DUE_DATE
      },
    })
      .then((loanPolicy) => {
        createdLoanPolicy = loanPolicy;

        cy.getRequestPolicy({ query: `name=="${REQUEST_POLICY_NAMES.ALLOW_ALL}"` });
        cy.getNoticePolicy({ query: `name=="${NOTICE_POLICY_NAMES.SEND_NO_NOTICES}"` });
        cy.getOverdueFinePolicy({ query: `name=="${OVERDUE_FINE_POLICY_NAMES.OVERDUE_FINE_POLICY}"` });
        cy.getLostItemFeesPolicy({ query: `name=="${LOST_ITEM_FEES_POLICY_NAMES.LOST_ITEM_FEES_POLICY}"` });
        cy.getCirculationRules()
          .then(rules => {
            rulesDefaultString = rules.rulesAsText;
          });
      })
      .then(() => {
        requestPolicyId = Cypress.env(CY_ENV.REQUEST_POLICY)[0].id;
        noticePolicyId = Cypress.env(CY_ENV.NOTICE_POLICY)[0].id;
        overdueFinePolicyId = Cypress.env(CY_ENV.OVERDUE_FINE_POLICY)[0].id;
        lostItemFeesPolicyId = Cypress.env(CY_ENV.LOST_ITEM_FEES_POLICY)[0].id;
        const newRule = `\ng ${patronGroupId} + m ${materialTypeId}: l ${createdLoanPolicy.id} r ${requestPolicyId} n ${noticePolicyId} o ${overdueFinePolicyId} i ${lostItemFeesPolicyId}`;

        cy.updateCirculationRules({
          rulesAsText: rulesDefaultString + newRule,
        });
      });
  }
};
