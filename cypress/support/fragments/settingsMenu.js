export default class SettingsMenu {
    // direct paths to folio apps to use in cy.visit() into initial steps of our scenarios
    // TODO: add separated scenarios related with TopMenu implementation
    static invoice = 'settings/invoice';
    static circulation = 'settings/circulation'
}
