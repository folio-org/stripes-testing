export default class TopMenu {
  // direct paths to folio apps to use in cy.visit() into initial steps of our scenarios
  // TODO: add separated scenarios related with TopMenu implementation
  static agreementsPath = '/erm/agreements';
  static inventoryPath = '/inventory';
  static settingsPath = '/settings';
  static financePath = '/finance';
  static ledgerPath = '/finance/ledger';
  static dataImportPath = '/data-import';
  static fiscalYearPath = '/finance/fiscalyear';
}
