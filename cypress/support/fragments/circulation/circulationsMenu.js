export default class CirculationMenu {
  // direct paths to folio apps to use in cy.visit() into initial steps of our scenarios
    // TODO: add separated scenarios related with CirculationMenu implementation
    static circulationRules = 'settings/circulation/rules';
    static otherSettings = 'settings/circulation/checkout';
    static staffSlips = 'settings/circulation/staffslips';
    static fixedDueDateSchedules = 'settings/circulation/fixed-due-date-schedules';
    static loanHistory = 'settings/circulation/loan-history';
    static loanPolicies = 'settings/circulation/loan-policies';
    static overdueFinePolicies = 'settings/circulation/fine-policies';
    static lostItemFeePolicy = 'settings/circulation/lost-item-fee-policy';
    static patronNoticePolicies = 'settings/circulation/notice-policies';
    static patronNoticeTemplates = 'settings/circulation/patron-notices';
    static requestCancellationReasons = 'settings/circulation/cancellation-reasons';
    static requestPolicies = 'settings/circulation/request-policies';
    static titleLevelRequests = 'settings/circulation/title-level-requests';
}
