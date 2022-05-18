export default {
  // eHoldings
  uieHoldingsRecordsEdit: { internal: 'ui-eholdings.records.edit', gui:'eHoldings: Can edit providers, packages, titles detail records' },
  uieHoldingsTitlesPackagesCreateDelete: { internal: 'ui-eholdings.titles-packages.create-delete', gui: 'eHoldings: Can create and delete custom packages and titles' },
  uieHoldingsPackageTitleSelectUnselect: { internal: 'ui-eholdings.package-title.select-unselect', gui:'eHoldings: Can select/unselect packages and titles to/from your holdings' },
  moduleeHoldingsEnabled: { internal:'module.eholdings.enabled', gui: 'eHoldings: Can view providers, packages, titles detail records' },
  // Notes
  uiNotesItemCreate:{ internal: 'ui-notes.item.create', gui: 'Notes: Can create a note' },
  uiNotesItemView: { internal: 'ui-notes.item.view', gui: 'Notes: Can view a note' },
  uiNotesItemEdit:{ internal: 'ui-notes.item.edit', gui: 'Notes: Can edit a note' },
  // Agreements
  uiAgreementsAgreementsEdit: { internal: 'ui-agreements.agreements.edit', gui: 'Agreements: Edit agreements' },
  uiAgreementsAgreementsDelete: { internal: 'ui-agreements.agreements.delete', gui: 'Agreements: Delete agreements' },
  // QuickMarc
  uiQuickMarcQuickMarcHoldingsEditorCreate: { internal: 'ui-quick-marc.quick-marc-holdings-editor.create', gui: 'quickMARC: Create a new MARC holdings record' },
  uiQuickMarcQuickMarcEditorDuplicate: { internal: 'ui-quick-marc.quick-marc-editor.duplicate', gui: 'quickMARC: Derive new MARC bibliographic record' },
  uiQuickMarcQuickMarcBibliographicEditorAll: { internal: 'ui-quick-marc.quick-marc-bibliographic-editor.all', gui: 'quickMARC: View, edit MARC bibliographic record' },
  uiQuickMarcQuickMarcHoldingsEditorAll: { internal: 'ui-quick-marc.quick-marc-holdings-editor.all', gui: 'quickMARC: View, edit MARC holdings record' },
  uiQuickMarcQuickMarcHoldingsEditorView:{ internal:'ui-quick-marc.quick-marc-holdings-editor.view', gui:'quickMARC: View MARC holdings record' },
  // Marc Authority record
  uiQuickMarcQuickMarcAuthoritiesEditorAll: { internal: 'ui-quick-marc.quick-marc-authorities-editor.all', gui: 'quickMARC: View, edit MARC authorities record' },
  uiMarcAuthoritiesAuthorityRecordView:{ internal: 'ui-marc-authorities.authority-record.view', gui:'MARC Authority: View MARC authority record' },
  uiMarcAuthoritiesAuthorityRecordEdit:{ internal: 'ui-marc-authorities.authority-record.edit', gui:'MARC Authority: Edit MARC authority record' },
  uiMarcAuthoritiesAuthorityRecordDelete:{ internal: 'ui-marc-authorities.authority-record.delete', gui: 'MARC Authority: Delete MARC authority record' },
  // Inventory
  // TODO: gui name related with several internal names. Clarify the reason
  inventoryAll: { internal: ['inventory.all', 'ui-inventory.all-permissions.TEMPORARY'], gui: 'Inventory: All permissions' },
  uiInventorySingleRecordImport: { internal: 'ui-inventory.single-record-import', gui: 'Inventory: Import single bibliographic records' },
  uiInventorySettingsFastAdd: { internal: 'ui-inventory.settings.fast-add', gui: 'Settings (Inventory): Edit fast add settings' },
  uiInventoryMarkItemsWithdrawn: { internal: 'ui-inventory.items.mark-items-withdrawn', gui: 'Inventory: Mark items withdrawn' },
  uiInventoryViewInstances: { internal: 'ui-inventory.instance.view', gui: 'Inventory: View instances, holdings, and items' },
  uiInventoryHoldingsMove:{ internal:'ui-inventory.holdings.move', gui:'Inventory: Move holdings' },
  uiCreateEditDeleteMaterialTypes: { internal: 'ui-inventory.settings.materialtypes', gui: 'Settings (Inventory): Create, edit, delete material types' },
  uiInventoryMarkAsMissing: { internal: 'ui-inventory.item.markasmissing', gui: 'Inventory: View, create, edit, mark missing items' },
  uiInventoryMoveItems: { internal: '', gui: 'Inventory: Move items' },
  // Tags
  uiTagsPermissionAll: { internal: 'ui-tags.permission.all', gui:'Tags: All permissions' },
  // Settings->Owners
  uiUsersSettingsOwners: { internal: 'ui-users.settings.owners', gui: 'Settings (Users): Can create, edit and remove owners' },
  uiUsersEdituserservicepoints: { internal: 'ui-users.edituserservicepoints', gui: 'Users: Can assign and unassign service points to users' },
  // Locations
  uiTenantSettingsSettingsLocation:{ internal: 'ui-tenant-settings.settings.location', gui:'Settings (tenant): Can create, edit and remove locations' },
  // DataImport
  dataImportUploadAll:{ internal: 'data-import.upload.all', gui:'Data Import File Upload - all permissions' },
  moduleDataImportEnabled:{ internal: 'module.data-import.enabled', gui:'Data import: all permissions' },
  settingsDataImportEnabled:{ internal: 'settings.data-import.enabled', gui:'Settings (Data import): Can view, create, edit, and remove' },
  // Storage
  converterStorageAll:{ internal: 'converter-storage.all', gui:'Data Import Converter Storage - all permissions' },
  inventoryStorageAuthoritiesAll:{ internal: 'inventory-storage.authorities.all', gui:'inventory storage module - all authorities permissions' },
  // Circulation log
  circulationLogAll: { internal: 'inn-reach.all', gui: 'Circulation log: All' },
  // Circulation
  uiCirculationViewCreateEditDelete: { internal: 'ui-circulation.settings.circulation-rules', gui: 'Settings (Circ): Can create, edit and remove circulation rules' },
  // Users
  usersViewRequests: { internal: '', gui: 'Users: View requests' },
  uiUsersView: { internal: 'ui-users.view', gui: 'Users: Can view user profile' },
  uiUserCreate: { internal: 'ui-users.create', gui: 'Users: Create users' },
  uiUserEdit: { internal: 'ui-users.edit', gui: 'Users: Can edit user profile' },
  uiUserAccounts: { internal: 'ui-users.accounts', gui: 'Fee/Fine History: Can create, edit and remove accounts' },
  uiUserRequestsAll: { internal: 'ui-users.requests.all', gui: 'Users: View requests' },
  uiUsersViewLoans: { internal: 'ui-users.loans.view', gui: 'Users: User loans view' },
  uiUsersDeclareItemLost: { internal: 'ui-users.loans.declare-item-lost', gui: 'Users: User loans declare lost' },
  uiUsersEditProfile: { internal: 'ui-users.edit', gui: 'Users: Can edit user profile' },
  uiUsersViewProfile: { internal: 'ui-users.view', gui: 'Users: Can view user profile' },
  uiUsersPermissions: { internal: 'ui-users.editperms', gui: 'Users: Can assign and unassign permissions to users' },
  // Remote Storage
  remoteStorageCRUD: { internal: '', gui: 'Settings (Remote storage): Can create, edit, delete remote storage settings' },
  // Requests
  uiRequestsCreate: { internal: 'ui-requests.create', gui: 'Requests: View, create' },
  uiRequestsView: { internal: 'ui-requests.view', gui: 'Requests: View' },
  requestsAll: { internal: 'ui-requests.all', gui: 'Requests: All permissions' },
  // Calendar
  calendarEdit: { internal: 'ui-calendar.edit', gui: 'Settings (Calendar): Can create, view, and edit calendar events' },
  calendarAll: { internal: 'ui-calendar.all', gui: 'Settings (Calendar): Can create, view, edit, and remove calendar events' },
  // Data Export
  dataExportAll: { internal: 'data-export.all', gui: 'Data Export - all permissions' },
  // Loans
  loansAll: { internal: 'ui-users.loans.all', gui: 'Users: User loans view, change due date, renew' },
  loansView: { internal: 'ui-users.loans.view', gui: 'Users: User loans view' },
  loansRenew: { internal: 'ui-users.loans.renew', gui: 'Users: User loans renew' },
  loansRenewOverride: { internal: 'ui-users.loans.renew-override', gui: 'Users: User loans renew through override' },
  // Checkout
  checkoutAll: { internal: '', gui: 'Check out: All permissions' },
  checkoutCirculatingItems: { internal: 'ui-checkout.circulation', gui: 'Check out: Check out circulating items' },
  // Checkin
  checkinAll: { internal: '', gui: 'Check in: All permissions' }
};
