export default class SettingsMenu {
    // direct paths to folio apps to use in cy.visit() into initial steps of our scenarios
    // TODO: add separated scenarios related with SettingsMenu implementation
    static acquisitionUnitsPath = 'settings/acquisition-units';
    static agreementsPath = 'settings/erm';
    static calendarPath = 'settings/calendar';
    static circulationPath = 'settings/circulation';
    static coursesPath = 'settings/cr';
    static dashboardPath = 'settings/dashboard';
    static dataExportPath = 'settings/data-export';
    static dataImportPath = 'settings/data-import';
    static developerPath = 'settings/developer';
    static eHoldingsPath = 'settings/eholdings';
    static ermComparisonsPath = 'settings/comparisons-erm';
    static eUsagePath = 'settings/eusage';
    static financePath = 'settings/finance';
    static innReachPath = 'settings/innreach';
    static inventoryPath = 'settings/inventory';
    static invoicePath = 'settings/invoice';
    static ldpPath = 'settings/ldp';
    static licensesPath = 'settings/licenses';
    static localKbAdminPath = 'settings/local-kb-admin';
    static myProfilePath = 'settings/myprofile';
    static notesPath = 'settings/notes';
    static oaiPmhPath = 'settings/oai-pmh';
    static openAccessPath = 'settings/oa';
    static ordersPath = 'settings/orders';
    static organizationsPath = 'settings/organizations';
    static remoteStoragePath = 'settings/remote-storage';
    static tagsPath = 'settings/tags';
    static tenantPath = 'settings/tenant-settings';
    static usersPath = 'settings/users';
}
