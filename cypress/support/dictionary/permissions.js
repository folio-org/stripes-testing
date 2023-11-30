export default {
  // bulk edit
  bulkEditView: {
    internal: 'ui-bulk-edit.app-view',
    gui: 'Bulk Edit: In app - View inventory records',
  },
  bulkEditEdit: {
    internal: 'ui-bulk-edit.app-edit',
    gui: 'Bulk Edit: In app - Edit inventory records',
  },
  bulkEditCsvView: { internal: 'ui-bulk-edit.view', gui: 'Bulk Edit: Local - View user records' },
  bulkEditCsvEdit: { internal: 'ui-bulk-edit.edit', gui: 'Bulk Edit: Local - Edit user records' },
  bulkEditCsvDelete: { internal: 'ui-bulk-edit.delete', gui: 'Bulk Edit: (CSV) Delete' },
  bulkEditUpdateRecords: {
    internal: 'ui-bulk-edit.app-edit.users',
    gui: 'Bulk edit: In app - Edit user records',
  },
  bulkEditQueryView: { internal: 'ui-bulk-edit.query', gui: 'Bulk edit: Can build query' },
  bulkEditLogsView: { internal: 'ui-bulk-edit.logs.view', gui: 'Bulk edit: Can view logs' },
  // eHoldings
  uieHoldingsRecordsEdit: {
    internal: 'ui-eholdings.records.edit',
    gui: 'eHoldings: Can edit providers, packages, titles detail records',
  },
  uieHoldingsTitlesPackagesCreateDelete: {
    internal: 'ui-eholdings.titles-packages.create-delete',
    gui: 'eHoldings: Can create and delete custom packages and titles',
  },
  uieHoldingsPackageTitleSelectUnselect: {
    internal: 'ui-eholdings.package-title.select-unselect',
    gui: 'eHoldings: Can select/unselect packages and titles to/from your holdings',
  },
  moduleeHoldingsEnabled: {
    internal: 'module.eholdings.enabled',
    gui: 'eHoldings: Can view providers, packages, titles detail records',
  },
  // Notes
  uiNotesItemCreate: { internal: 'ui-notes.item.create', gui: 'Notes: Can create a note' },
  uiNotesItemView: { internal: 'ui-notes.item.view', gui: 'Notes: Can view a note' },
  uiNotesItemEdit: { internal: 'ui-notes.item.edit', gui: 'Notes: Can edit a note' },
  uiNotesItemDelete: { internal: 'ui-notes.item.delete', gui: 'Notes: Can delete a note' },
  uiNotesSettingsEdit: {
    internal: 'ui-notes.settings.edit',
    gui: 'Settings (Notes): Edit and View General settings',
  },
  uiNotesAssignUnassign: {
    internal: 'ui-notes.item.assign-unassign',
    gui: 'Notes: Can assign and unassign a note',
  },
  // Agreements
  uiAgreementsAgreementsEdit: {
    internal: 'ui-agreements.agreements.edit',
    gui: 'Agreements: Edit agreements',
  },
  uiAgreementsAgreementsDelete: {
    internal: 'ui-agreements.agreements.delete',
    gui: 'Agreements: Delete agreements',
  },
  uiAgreementsSearchAndView: {
    internal: 'ui-agreements.agreements.view',
    gui: 'Agreements: Search & view agreements',
  },
  uiAgreementsSearch: {
    internal: 'ui-plugin-find-agreement.search',
    gui: 'Find Agreement Plugin: Search agreements',
  },
  uiAgreementsFileDownload: {
    internal: 'ui-agreements.agreements.edit',
    gui: 'Agreements: File download',
  },
  // QuickMarc
  uiQuickMarcQuickMarcHoldingsEditorCreate: {
    internal: 'ui-quick-marc.quick-marc-holdings-editor.create',
    gui: 'quickMARC: Create a new MARC holdings record',
  },
  uiQuickMarcQuickMarcBibliographicEditorCreate: {
    internal: 'ui-quick-marc.quick-marc-bibliographic-editor.create',
    gui: 'quickMARC: Create a new MARC bibliographic record',
  },
  uiQuickMarcQuickMarcEditorDuplicate: {
    internal: 'ui-quick-marc.quick-marc-editor.duplicate',
    gui: 'quickMARC: Derive new MARC bibliographic record',
  },
  uiQuickMarcQuickMarcBibliographicEditorAll: {
    internal: 'ui-quick-marc.quick-marc-bibliographic-editor.all',
    gui: 'quickMARC: View, edit MARC bibliographic record',
  },
  uiQuickMarcQuickMarcHoldingsEditorAll: {
    internal: 'ui-quick-marc.quick-marc-holdings-editor.all',
    gui: 'quickMARC: View, edit MARC holdings record',
  },
  uiQuickMarcQuickMarcHoldingsEditorView: {
    internal: 'ui-quick-marc.quick-marc-holdings-editor.view',
    gui: 'quickMARC: View MARC holdings record',
  },
  uiQuickMarcQuickMarcBibliographicEditorView: {
    internal: 'ui-quick-marc.quick-marc-editor.view',
    gui: 'quickMARC: View MARC bibliographic record',
  },
  uiQuickMarcQuickMarcAuthorityLinkUnlink: {
    internal: 'ui-quick-marc.quick-marc-authority-records.linkUnlink',
    gui: 'quickMARC: Can Link/unlink authority records to bib records',
  },
  // Marc Authority record
  uiQuickMarcQuickMarcAuthoritiesEditorAll: {
    internal: 'ui-quick-marc.quick-marc-authorities-editor.all',
    gui: 'quickMARC: View, edit MARC authorities record',
  },
  uiMarcAuthoritiesAuthorityRecordView: {
    internal: 'ui-marc-authorities.authority-record.view',
    gui: 'MARC Authority: View MARC authority record',
  },
  uiMarcAuthoritiesAuthorityRecordEdit: {
    internal: 'ui-marc-authorities.authority-record.edit',
    gui: 'MARC Authority: Edit MARC authority record',
  },
  uiMarcAuthoritiesAuthorityRecordDelete: {
    internal: 'ui-marc-authorities.authority-record.delete',
    gui: 'MARC Authority: Delete MARC authority record',
  },
  // Inventory
  // TODO: gui name related with several internal names. Clarify the reason
  inventoryAll: {
    internal: ['inventory.all', 'Inventory: All permissions'],
    gui: 'Inventory: All permissions',
  },
  uiCallNumberBrowse: {
    internal: 'browse.call-numbers.instances.collection.get',
    gui: 'Call number browse: View permissions',
  },
  uiSubjectBrowse: {
    internal: 'ui-inventory.subjects.view',
    gui: 'Subject browse: View permissions',
  },
  uiInventorySingleRecordImport: {
    internal: 'ui-inventory.single-record-import',
    gui: 'Inventory: Import single bibliographic records',
  },
  uiInventoryMarkItemsWithdrawn: {
    internal: 'ui-inventory.items.mark-items-withdrawn',
    gui: 'Inventory: Mark items withdrawn',
  },
  uiInventoryViewInstances: {
    internal: 'ui-inventory.instance.view',
    gui: 'Inventory: View instances, holdings, and items',
  },
  uiInventoryStorageModule: {
    internal: 'inventory-storage.all',
    gui: 'inventory storage module - all permissions',
  },
  uiInventoryHoldingsMove: {
    internal: 'ui-inventory.holdings.move',
    gui: 'Inventory: Move holdings',
  },
  uiInventoryMarkAsMissing: {
    internal: 'ui-inventory.item.markasmissing',
    gui: 'Inventory: View, create, edit, mark missing items',
  },
  uiInventoryMoveItems: { internal: 'ui-inventory.item.move', gui: 'Inventory: Move items' },
  uiInventoryViewCreateEditHoldings: {
    internal: 'ui-inventory.holdings.edit',
    gui: 'Inventory: View, create, edit holdings',
  },
  uiInventoryViewCreateEditInstances: {
    internal: 'ui-inventory.instance.edit',
    gui: 'Inventory: View, create, edit instances',
  },
  inventoryViewCreateEditInstances: {
    internal: 'records-editor.records.item.get',
    gui: 'All records-editor permissions',
  },
  uiInventoryViewCreateEditItems: {
    internal: 'ui-inventory.item.edit',
    gui: 'Inventory: View, create, edit items',
  },
  uiInventoryViewCreateEditDeleteItems: {
    internal: 'ui-inventory.item.delete',
    gui: 'Inventory: View, create, edit, delete items',
  },
  uiInventoryMarcItemInProcess: {
    internal: 'ui-inventory.items.mark-in-process-non-requestable',
    gui: 'Inventory: Mark items in process (non-requestable)',
  },
  uiInventoryMarcItemIntellectual: {
    internal: 'ui-inventory.items.mark-intellectual-item',
    gui: 'Inventory: Mark items intellectual item',
  },
  uiInventoryMarcItemLongMissing: {
    internal: 'ui-inventory.items.mark-long-missing',
    gui: 'Inventory: Mark items long missing',
  },
  uiInventoryMarcItemRestricted: {
    internal: 'ui-inventory.items.mark-restricted',
    gui: 'Inventory: Mark items restricted',
  },
  uiInventoryMarcItemUnavailable: {
    internal: 'ui-inventory.items.mark-unavailable',
    gui: 'Inventory: Mark items unavailable',
  },
  uiInventoryMarcItemUnknow: {
    internal: 'ui-inventory.items.mark-unknown',
    gui: 'Inventory: Mark items unknown',
  },
  uiCreateEditDeleteURL: {
    internal: 'ui-inventory.settings.electronic-access-relationships',
    gui: 'Settings (Inventory): Create, edit, delete URL relationships',
  },
  inventoryCRUDHoldings: {
    internal: 'ui-inventory.holdings.delete',
    gui: 'Inventory: View, create, edit, delete holdings',
  },
  inventoryCRUDItemNoteTypes: {
    internal: 'ui-inventory.settings.item-note-types',
    gui: 'Settings (Inventory): Create, edit, delete item note types',
  },
  notesSettingsViewGeneralSettings: {
    internal: 'ui-notes.settings.view',
    gui: 'Settings (Notes): View General settings',
  },
  // Tags
  uiTagsPermissionAll: { internal: 'ui-tags.permission.all', gui: 'Tags: All permissions' },
  uiViewTagsSettings: {
    internal: 'ui-tags.settings.view',
    gui: 'Settings (Tags): Can view tags settings',
  },
  uiUserCanEnableDisableTags: {
    internal: 'ui-tags.settings.all',
    gui: 'Settings (Tags): Can enable or disable tags for all apps',
  },
  // Settings->Owners
  uiUsersSettingsAllFeeFinesRelated: {
    internal: 'ui-users.settings.feefines.all',
    gui: 'Settings (Users): Can create, edit and remove all feefines-related entries',
  },
  uiUsersSettingsOwners: {
    internal: 'ui-users.settings.owners',
    gui: 'Settings (Users): Can create, edit and remove owners',
  },
  uiUsersEdituserservicepoints: {
    internal: 'ui-users.edituserservicepoints',
    gui: 'Users: Can assign and unassign service points to users',
  },
  // Locations
  uiTenantSettingsSettingsLocation: {
    internal: 'ui-tenant-settings.settings.location',
    gui: 'Settings (tenant): Can create, edit and remove locations',
  },
  uiTenantSettingsServicePointsCRUD: {
    internal: 'ui-tenant-settings.settings.servicepoints',
    gui: 'Settings (tenant): Can create, edit and remove service points',
  },
  // DataImport
  dataImportUploadAll: {
    internal: 'data-import.upload.all',
    gui: 'Data Import File Upload - all permissions',
  },
  moduleDataImportEnabled: {
    internal: 'ui-data-import.settings.manage',
    gui: 'Data import: Can upload files, import, and view logs',
  },
  dataImportDeleteLogs: {
    internal: 'ui-data-import.logs.delete',
    gui: 'Data import: Can delete import logs',
  },
  // Storage
  converterStorageAll: {
    internal: 'converter-storage.all',
    gui: 'Data Import Converter Storage - all permissions',
  },
  inventoryStorageAuthoritiesAll: {
    internal: 'inventory-storage.authorities.all',
    gui: 'inventory storage module - all authorities permissions',
  },
  // Circulation log
  circulationLogAll: { internal: 'inn-reach.all', gui: 'Circulation log: All' },
  circulationLogView: {
    internal: 'ui-circulation-log.log-event.view',
    gui: 'Circulation log: View',
  },
  // Circulation
  uiCirculationViewCreateEditDelete: {
    internal: 'ui-circulation.settings.circulation-rules',
    gui: 'Settings (Circ): Can create, edit and remove circulation rules',
  },
  uiCirculationSettingsNoticeTemplates: {
    internal: 'ui-circulation.settings.notice-templates',
    gui: 'Settings (Circ): Can create, edit and remove patron notice templates',
  },
  uiCirculationSettingsNoticePolicies: {
    internal: 'ui-circulation.settings.notice-policies',
    gui: 'Settings (Circ): Can create, edit and remove notice policies',
  },
  uiCirculationSettingsOtherSettings: {
    internal: 'ui-circulation.settings.other-settings',
    gui: 'Settings (Circ): Can create, edit and remove other settings',
  },
  uiCirculationCreateEditRemoveStaffSlips: {
    internal: 'ui-circulation.settings.staff-slips',
    gui: 'Settings (Circ): Can create, edit and remove staff slips',
  },
  // Users
  usersViewRequests: { internal: 'ui-users.requests.all', gui: 'Users: View requests' },
  uiUsersView: { internal: 'ui-users.view', gui: 'Users: Can view user profile' },
  uiUsersPermissionsView: {
    internal: 'ui-users.viewperms',
    gui: 'Users: Can view permissions assigned to users',
  },
  uiUsersCreate: { internal: 'ui-users.create', gui: 'Users: Can create and edit users' },
  uiUserEdit: { internal: 'ui-users.edit', gui: 'Users: Can edit user profile' },
  uiUsersDelete: {
    internal: 'ui-users.delete',
    gui: 'Users: Can delete user profile if user does not have any open transactions',
  },
  uiUsersCreateResetPassword: {
    internal: 'ui-users.reset.password',
    gui: 'Users: Create/reset password',
  },
  uiUsersCheckTransactions: {
    internal: 'ui-users.opentransactions',
    gui: 'Users: Can check open transactions',
  },
  uiUserAccounts: {
    internal: 'ui-users.accounts',
    gui: 'Fee/Fine History: Can create, edit and remove accounts',
  },
  uiUsersViewLoans: { internal: 'ui-users.loans.view', gui: 'Users: User loans view' },
  uiUserLoansAnonymize: {
    internal: 'ui-users.loans.anonymize',
    gui: 'Users: User loans anonymize',
  },
  uiUserLostItemRequiringActualCost: {
    internal: 'ui-users.lost-items.requiring-actual-cost',
    gui: 'Users: Can process lost items requiring actual cost',
  },
  uiFeeFinesActions: {
    internal: 'ui-users.feefineactions',
    gui: 'Fee/Fine Details: Can create, edit and remove fee/fine actions',
  },
  uiFeeFinesCanWaive: {
    internal: 'ui-users.manual_waive',
    gui: 'Fees/Fines: Can waive',
  },
  uiFeeFines: {
    internal: 'ui-users.feesfines.actions.all',
    gui: 'Users: Can create, edit and remove fees/fines',
  },
  uiUsersLoansClaimReturned: {
    internal: 'ui-users.loans.claim-item-returned',
    gui: 'Users: User loans claim returned',
  },
  uiUsersLoansClaimReturnedMissing: {
    internal: 'ui-users.loans.declare-claimed-returned-item-as-missing',
    gui: 'Users: User loans mark claimed returned missing',
  },
  uiUsersDeclareItemLost: {
    internal: 'ui-users.loans.declare-item-lost',
    gui: 'Users: User loans declare lost',
  },
  usersLoansRenewThroughOverride: {
    internal: 'ui-users.loans.renew-override',
    gui: 'Users: User loans renew through override',
  },
  uiUsersPermissions: {
    internal: 'ui-users.editperms',
    gui: 'Users: Can assign and unassign permissions to users',
  },
  uiUsersfeefinesView: {
    internal: 'ui-users.feesfines.view',
    gui: 'Users: Can view fees/fines and loans',
  },
  uiUsersManualCharge: { internal: 'ui-users.manual_charge', gui: 'Fees/Fines: Can charge' },
  uiUsersManualPay: { internal: 'ui-users.manual_pay', gui: 'Fees/Fines: Can pay' },
  uiUsersViewServicePoints: {
    internal: 'ui-users.viewuserservicepoints',
    gui: 'Users: Can view service points assigned to users',
  },
  uiUsersfeefinesCRUD: {
    internal: 'ui-users.feesfines.actions.all',
    gui: 'Users: Can create, edit and remove fees/fines',
  },
  uiUsersPatronBlocks: {
    internal: 'ui-users.patron_blocks',
    gui: 'Users: Can create, edit and remove patron blocks',
  },
  uiUsersCreatePatronTamplate: {
    internal: 'ui-users.settings.patron-block-templates',
    gui: 'Settings (Users): Can create, edit and remove patron blocks templates',
  },
  uiUsersCreatePatronGroups: {
    internal: 'ui-users.settings.usergroups',
    gui: 'Settings (Users): Can create, edit and remove patron groups',
  },
  uiUsersCreatePatronLimits: {
    internal: 'ui-users.settings.limits',
    gui: 'Settings (Users): Can create, edit and remove patron blocks limits',
  },
  uiUsersCreatePatronConditions: {
    internal: 'ui-users.settings.conditions',
    gui: 'Settings (Users): Can view and edit patron blocks conditions',
  },
  uiUsersCanViewCustomFields: {
    internal: 'ui-users.settings.customfields.view',
    gui: 'Settings (Users): Can view custom fields',
  },
  uiUsersCustomField: {
    internal: 'ui-users.settings.customfields.all',
    gui: 'Settings (Users): Can create, edit, view and delete custom fields',
  },
  uiUsersViewPermissionSets: {
    internal: 'ui-users.settings.permsets.view',
    gui: 'Settings (Users): Can view permission sets',
  },
  uiUsersViewAllSettings: {
    internal: 'ui-users.settings.view',
    gui: 'Settings (Users): View all settings',
  },
  uiUserLoansChangeDueDate: {
    internal: 'ui-users.loans.change-due-date',
    gui: 'Users: User loans change due date',
  },
  uiUserFinancialTransactionReport: {
    internal: 'ui-users.financialTransactionReport',
    gui: 'Users: Create and download Financial transaction detail report',
  },
  // Remote Storage
  remoteStorageCRUD: {
    internal: 'ui-remote-storage.settings.remote-storages.edit',
    gui: 'Remote storage: Create, edit, delete',
  },
  remoteStorageView: {
    internal: 'ui-remote-storage.settings.remote-storages.view',
    gui: 'Remote storage: View',
  },
  // Requests
  uiRequestsAll: { internal: 'ui-requests.all', gui: 'Requests: All permissions' },
  uiRequestsCreate: { internal: 'ui-requests.create', gui: 'Requests: View, create' },
  uiRequestsView: { internal: 'ui-requests.view', gui: 'Requests: View' },
  uiRequestsEdit: { internal: 'ui-requests.edit', gui: 'Requests: View, edit, cancel' },
  requestsAll: { internal: 'ui-requests.all', gui: 'Requests: All permissions' },
  tlrEdit: {
    internal: 'ui-circulation.settings.titleLevelRequests',
    gui: 'Settings (Circulation): Title level request edit',
  },
  // Calendar
  calendarEdit: {
    internal: 'ui-calendar.edit',
    gui: 'Settings (Calendar): Can create, view, and edit calendar events',
  },
  calendarAll: {
    internal: 'ui-calendar.all',
    gui: 'Settings (Calendar): Can create, view, edit, and remove calendar events',
  },
  // Data Export
  dataExportAll: { internal: 'data-export.all', gui: 'Data Export - all permissions' },
  dataExportEnableModule: {
    internal: 'module.data-export.enabled',
    gui: 'Data export: all permissions',
  },
  dataExportEnableSettings: {
    internal: 'ui-data-export.settings.enabled',
    gui: 'Settings (Data export): display list of settings pages',
  },
  dataExportEnableApp: {
    internal: 'ui-data-export.app.enabled',
    gui: 'UI: Data export module is enabled',
  },
  // Loans
  loansAll: {
    internal: 'ui-users.loans.all',
    gui: 'Users: User loans view, change due date, renew',
  },
  loansView: { internal: 'ui-users.loans.view', gui: 'Users: User loans view' },
  loansRenew: { internal: 'ui-users.loans.renew', gui: 'Users: User loans renew' },
  loansRenewOverride: {
    internal: 'ui-users.loans.renew-override',
    gui: 'Users: User loans renew through override',
  },
  overridePatronBlock: {
    internal: 'ui-users.overridePatronBlock',
    gui: 'User: Can override patron blocks',
  },
  // Checkout
  checkoutAll: { internal: 'ui-checkout.all', gui: 'Check out: All permissions' },
  checkoutCirculatingItems: {
    internal: 'ui-checkout.circulation',
    gui: 'Check out: Check out circulating items',
  },
  checkoutViewFeeFines: { internal: 'ui-checkout.viewFeeFines', gui: 'Check out: View fees/fines' },
  // Checkin
  checkinAll: { internal: 'ui-checkin.all', gui: 'Check in: All permissions' },
  // Receiving
  uiReceivingViewEditCreate: {
    internal: 'ui-receiving.create',
    gui: 'Receiving: View, edit, create',
  },
  uiReceivingViewEditDelete: {
    internal: 'ui-receiving.delete',
    gui: 'Receiving: View, edit, delete',
  },
  // Invoice
  viewEditDeleteInvoiceInvoiceLine: {
    internal: 'ui-invoice.invoice.delete',
    gui: 'Invoice: Can view, edit and delete Invoices and Invoice lines',
  },
  viewEditCreateInvoiceInvoiceLine: {
    internal: 'ui-invoice.invoice.create',
    gui: 'Invoice: Can view, edit and create new Invoices and Invoice lines',
  },
  assignAcqUnitsToNewInvoice: {
    internal: 'ui-invoice.acq.unit.assignment.assign',
    gui: 'Invoice: Assign acquisition units to new invoice',
  },
  uiInvoicesApproveInvoices: { internal: 'ui-invoice.approve', gui: 'Invoice: Approve invoices' },
  uiInvoicesPayInvoices: { internal: 'ui-invoice.pay', gui: 'Invoice: Pay invoices' },
  uiInvoicesPayInvoicesInDifferentFiscalYear: {
    internal: 'ui-invoice.payDifferentFY',
    gui: 'Invoice: Pay invoices in a different fiscal year',
  },
  invoiceSettingsAll: {
    internal: 'ui-invoice.settings.all',
    gui: 'Settings (Invoices): Can view and edit settings',
  },
  invoiceSettingsBatchGroupViewEdit: {
    internal: 'ui-invoice.batchVoucher.exportConfigs.credentials.edit',
    gui: 'Settings (Invoices): Batch group usernames and passwords: view and edit',
  },
  uiInvoicesCancelInvoices: { internal: 'ui-invoice.cancel', gui: 'Invoice: Cancel invoices' },
  uiInvoicesCanViewAndEditInvoicesAndInvoiceLines: {
    internal: 'ui-invoice.invoice.edit',
    gui: 'Invoice: Can view and edit Invoices and Invoice lines',
  },
  uiInvoicesCanViewInvoicesAndInvoiceLines: {
    internal: 'ui-invoice.invoice.view',
    gui: 'Invoice: Can view Invoices and Invoice lines',
  },

  uiInvoicesDownloadBatchFileFromInvoiceRecord: {
    internal: 'ui-invoice.batchVoucher.download',
    gui: 'Invoice: Download batch file from invoice record',
  },
  uiInvoicesExportSearchResults: {
    internal: 'ui-invoice.exportCSV',
    gui: 'Invoice: Export search results',
  },
  uiInvoicesManageAcquisitionUnits: {
    internal: 'ui-invoice.acq.unit.assignment.manage',
    gui: 'Invoice: Manage acquisition units',
  },
  uiInvoicesVoucherExport: { internal: 'ui-invoice.voucherExport', gui: 'Invoice: Voucher export' },
  // Orders
  uiOrdersView: {
    internal: 'ui-orders.orders.view',
    gui: 'Orders: Can view Orders and Order lines',
  },
  uiOrdersCreate: {
    internal: 'ui-orders.orders.create',
    gui: 'Orders: Can create new Orders and Order lines',
  },
  uiOrdersEdit: {
    internal: 'ui-orders.orders.edit',
    gui: 'Orders: Can edit Orders and Order lines',
  },
  uiOrdersDelete: {
    internal: 'ui-orders.orders.delete',
    gui: 'Orders: Can delete Orders and Order lines',
  },
  uiExportOrders: { internal: 'ui-orders.order.exportCSV', gui: 'Orders: Export search results' },
  uiOrdersApprovePurchaseOrders: {
    internal: 'ui-orders.order.approve',
    gui: 'Orders: Approve purchase orders',
  },
  uiOrdersAssignAcquisitionUnitsToNewOrder: {
    internal: 'ui-orders.acq.unit.assignment.assign',
    gui: 'Orders: Assign acquisition units to new order',
  },
  uiOrdersCancelOrderLines: {
    internal: 'ui-orders.order-lines.cancel',
    gui: 'Orders: Cancel order lines',
  },
  uiOrdersCancelPurchaseOrders: {
    internal: 'ui-orders.order.cancel',
    gui: 'Orders: Cancel purchase orders',
  },
  uiOrdersManageAcquisitionUnits: {
    internal: 'ui-orders.acq.unit.assignment.manage',
    gui: 'Orders: Manage acquisition units',
  },
  uiOrdersReopenPurchaseOrders: {
    internal: 'ui-orders.order.reopen',
    gui: 'Orders: Reopen purchase orders',
  },
  uiOrdersShowAllHiddenFields: {
    internal: 'ui-orders.order.showHidden',
    gui: 'Orders: Show all hidden fields',
  },
  uiOrdersUnopenpurchaseorders: {
    internal: 'ui-orders.order.unopen',
    gui: 'Orders: Unopen purchase orders',
  },
  uiOrdersUpdateEncumbrances: {
    internal: 'ui-orders.order.updateEncumbrances',
    gui: 'Orders: Update encumbrances',
  },
  uiSettingsOrdersCanViewAllSettings: {
    internal: 'ui-orders.settings.view',
    gui: 'Settings (Orders): Can view all settings',
  },
  uiSettingsOrdersCanViewAndEditAllSettings: {
    internal: 'ui-orders.settings.all',
    gui: 'Settings (Orders): Can view and edit all settings',
  },
  uiSettingsOrdersCanViewOrderTemplates: {
    internal: 'ui-orders.settings.order-templates.view',
    gui: 'Settings (Orders): Can view Order Templates',
  },
  uiSettingsOrdersCanViewEditOrderTemplates: {
    internal: 'ui-orders.settings.order-templates.edit',
    gui: 'Settings (Orders): Can view, edit Order Templates',
  },
  uiSettingsOrdersCanViewEditCreateNewOrderTemplates: {
    internal: 'ui-orders.settings.order-templates.create',
    gui: 'Settings (Orders): Can view, edit, create new Order Templates',
  },
  uiSettingsOrdersCanViewEditDeleteOrderTemplates: {
    internal: 'ui-orders.settings.order-templates.delete',
    gui: 'Settings (Orders): Can view, edit, delete Order Templates',
  },
  // Finance
  uiFinanceFinanceViewGroup: {
    internal: 'ui-finance.acq.unit.assignment.assign',
    gui: 'Finance: View group',
  },
  uiFinanceCreateAllocations: {
    internal: 'ui-finance.allocations.create',
    gui: 'Finance: Create allocations',
  },
  uiFinanceCreateTransfers: {
    internal: 'ui-finance.transfers.create',
    gui: 'Finance: Create transfers',
  },
  uiFinanceExecuteFiscalYearRollover: {
    internal: 'ui-finance.ledger.rollover',
    gui: 'Finance: Execute fiscal year rollover',
  },
  uiFinanceExportFinanceRecords: {
    internal: 'ui-finance.exportCSV',
    gui: 'Finance: Export finance records',
  },
  uiFinanceManageAcquisitionUnits: {
    internal: 'ui-finance.acq.unit.assignment.manage',
    gui: 'Finance: Manage acquisition units',
  },
  uiFinanceManuallyReleaseEncumbrance: {
    internal: 'ui-finance.manually-release-encumbrances',
    gui: 'Finance: Manually release encumbrance',
  },
  uiFinanceViewFiscalYear: {
    internal: 'ui-finance.fiscal-year.view',
    gui: 'Finance: View fiscal year',
  },
  uiFinanceViewFundAndBudget: {
    internal: 'ui-finance.fund-budget.view',
    gui: 'Finance: View fund and budget',
  },
  uiFinanceViewGroups: { internal: 'ui-finance.group.view', gui: 'Finance: View group' },
  uiFinanceViewLedger: { internal: 'ui-finance.ledger.view', gui: 'Finance: View ledger' },
  uiFinanceViewEditFiscalYear: {
    internal: 'ui-finance.fiscal-year.edit',
    gui: 'Finance: View, edit fiscal year',
  },
  uiFinanceViewEditFundAndBudget: {
    internal: 'ui-finance.fund-budget.edit',
    gui: 'Finance: View, edit fund and budget',
  },
  uiFinanceViewEditGroup: { internal: 'ui-finance.group.edit', gui: 'Finance: View, edit group' },
  uiFinanceViewEditLedger: {
    internal: 'ui-finance.ledger.edit',
    gui: 'Finance: View, edit ledger',
  },
  uiFinanceViewEditCreateFiscalYear: {
    internal: 'ui-finance.fiscal-year.create',
    gui: 'Finance: View, edit, create fiscal year',
  },
  uiFinanceViewEditCreateFundAndBudget: {
    internal: 'ui-finance.fund-budget.create',
    gui: 'Finance: View, edit, create fund and budget',
  },
  uiFinanceCreateViewEditGroups: {
    internal: 'ui-finance.group.create',
    gui: 'Finance: View, edit, create group',
  },
  uiFinanceViewEditCreateLedger: {
    internal: 'ui-finance.ledger.create',
    gui: 'Finance: View, edit, create ledger',
  },
  uiFinanceViewEditDeleteFiscalYear: {
    internal: 'ui-finance.fiscal-year.delete',
    gui: 'Finance: View, edit, delete fiscal year',
  },
  uiFinanceViewEditDeletFundBudget: {
    internal: 'ui-finance.fund-budget.delete',
    gui: 'Finance: View, edit, delete fund and budget',
  },
  uiFinanceViewEditDeletGroups: {
    internal: 'ui-finance.group.delete',
    gui: 'Finance: View, edit, delete group',
  },
  uiFinanceViewEditDeleteLedger: {
    internal: 'ui-finance.ledger.delete',
    gui: 'Finance: View, edit, delete ledger',
  },
  uiSettingsFinanceViewEditCreateDeleter: {
    internal: 'ui-finance.settings.all',
    gui: 'Settings (Finance): View, edit, create, delete',
  },
  uiSettingsFinanceView: {
    internal: 'ui-finance.settings.view',
    gui: 'Settings (Finance): View settings',
  },
  uiFinanceAssignAcquisitionUnitsToNewRecord: {
    internal: 'ui-finance.acq.unit.assignment.assign',
    gui: 'Finance: Assign acquisition units to new record',
  },
  // Organizations
  uiOrganizationsAssignAcquisitionUnitsToNewOrganization: {
    internal: 'ui-organizations.acqUnits.assig',
    gui: 'Organizations: Assign acquisition units to new organization',
  },
  uiOrganizationsIntegrationUsernamesAndPasswordsView: {
    internal: 'ui-organizations.integrations.creds.view',
    gui: 'Organizations: Integration usernames and passwords: view',
  },
  uiOrganizationsIntegrationUsernamesAndPasswordsViewEdit: {
    internal: 'ui-organizations.integrations.creds.edit',
    gui: 'Organizations: Integration usernames and passwords: view, edit',
  },
  uiOrganizationsInterfaceUsernamesAndPasswordsView: {
    internal: 'ui-organizations.creds.view',
    gui: 'Organizations: Interface usernames and passwords: view',
  },
  uiOrganizationsInterfaceUsernamesAndPasswordsViewEditCreateDelete: {
    internal: 'ui-organizations.creds.manage',
    gui: 'Organizations: Interface usernames and passwords: view, edit, create, delete',
  },
  uiOrganizationsManageAcquisitionUnits: {
    internal: 'ui-organizations.acqUnits.manage',
    gui: 'Organizations: Manage acquisition units',
  },
  uiOrganizationsView: { internal: 'ui-organizations.view', gui: 'Organizations: View' },
  uiOrganizationsViewEdit: { internal: 'ui-organizations.edit', gui: 'Organizations: View, edit' },
  uiOrganizationsViewEditCreate: {
    internal: 'ui-organizations.create',
    gui: 'Organizations: View, edit, create',
  },
  uiOrganizationsViewEditDelete: {
    internal: 'ui-organizations.delete',
    gui: 'Organizations: View, edit, delete',
  },
  uiSettingsOrganizationsCanViewAndEditSettings: {
    internal: 'ui-organizations.settings',
    gui: 'Settings (Organizations): Can view and edit settings',
  },
  uiSettingsOrganizationsCanViewOnlySettings: {
    internal: 'ui-organizations.settings.view',
    gui: 'Settings (Organizations): View settings',
  },
  // Settings
  uiSettingsAcquisitionUnitsViewEditCreateDelete: {
    internal: 'ui-acquisition-units.settings.all',
    gui: 'Settings (acquisition units): Can view, edit, create and delete acquisition units',
  },
  uiInventorySettingsFastAdd: {
    internal: 'ui-inventory.settings.fast-add',
    gui: 'Settings (Inventory): Edit fast add settings',
  },
  uiCreateEditDeleteMaterialTypes: {
    internal: 'ui-inventory.settings.materialtypes',
    gui: 'Settings (Inventory): Create, edit, delete material types',
  },
  uiInventorySettingsConfigureSingleRecordImport: {
    internal: 'ui-inventory.settings.single-record-import',
    gui: 'Settings (Inventory): Configure single-record import',
  },
  settingsDataImportView: {
    internal: 'ui-data-import.settings.readOnly',
    gui: 'Data import: Can view only',
  },
  settingsDataImportEnabled: {
    internal: 'settings.data-import.enabled',
    gui: 'Settings (Data import): Can view, create, edit, and remove',
  },
  settingsDataImportCanViewOnly: {
    internal: 'ui-data-import.settings.readOnly',
    gui: 'Settings (Data import): Can view only',
  },
  settingsTenantViewLocation: {
    internal: 'ui - tenant - settings.settings.location.view',
    gui: 'Settings (Tenant): View locations',
  },
  settingsTenantView: {
    internal: 'ui-tenant-settings.settings.view',
    gui: 'Settings (Tenant): View',
  },
  settingsTenantEditLanguageLocationAndCurrency: {
    internal: 'ui-tenant-settings.settings.locale',
    gui: 'Settings (tenant): Can edit language, localization, and currency',
  },
  settingsUsersCRUD: {
    internal: 'ui-users.settings.transfers.all',
    gui: 'Settings (Users): Can create, edit and remove transfer accounts ',
  },
  uiSettingsCanChangeLoacalPassword: {
    internal: 'ui-myprofile.settings.change-password',
    gui: 'Settings (My profile): Can change your local password',
  },
  uiSettingsTenantPlugins: {
    internal: 'ui-tenant-settings.settings.plugins',
    gui: 'Settings (tenant): Can maintain preferred plugins',
  },
  uiSettingsTenantSSO: {
    internal: 'ui-tenant-settings.settings.sso',
    gui: 'Settings (tenant): Can maintain SSO settings',
  },
  uiSettingsTenantAddresses: {
    internal: 'ui-tenant-settings.settings.addresses',
    gui: 'Settings (tenant): Can manage tenant addresses',
  },
  uiSettingsInstanceStatusesCreateEditDelete: {
    internal: 'ui-inventory.settings.instance-statuses',
    gui: 'Settings (Inventory): Create, edit, delete instance status types',
  },
  uiSettingsStatisticalCodesCreateEditDelete: {
    internal: 'ui-inventory.settings.statistical-codes',
    gui: 'Settings (Inventory): Create, edit, delete statistical codes',
  },
  // Added the below permissions for custom label creation

  uiSettingseholdingsViewEditCreateDelete: {
    internal: 'ui-eholdings.settings.all',
    gui: 'Settings (eholdings): Can create, edit, view, and delete custom labels',
  },
  uiSettingsDeveloperSessionLocale: {
    internal: 'ui-developer.settings.locale',
    gui: 'Settings (Developer): set session locale',
  },
  // Timers
  okapiTimersPatch: {
    internal: 'okapi.proxy.self.timers.patch',
    gui: 'Okapi - patch timer for current tenant',
  },
  // Export manager
  exportManagerAll: {
    internal: 'ui-export-manager.export-manager.all',
    gui: 'Export manager: All',
  },
  exportManagerDownloadAndResendFiles: {
    internal: 'ui-export-manager.jobs.downloadAndResend',
    gui: 'Export manager: Download and re-send files',
  },
  exportManagerView: {
    internal: 'ui-export-manager.export-manager.view',
    gui: 'Export manager: View',
  },
  transferExports: {
    internal: 'ui-plugin-bursar-export.bursar-exports.all',
    gui: 'Bursar exports: Bursar admin',
  },
  // OAI-PMH
  oaipmhViewLogs: {
    internal: 'ui-oai-pmh.logs',
    gui: 'Settings (OAI-PMH): Can view logs',
  },
  oaipmhSettingsEdit: {
    internal: 'ui-oai-pmh.edit',
    gui: 'Settings (OAI-PMH): Can view and edit settings',
  },
  uiCirculationSettingsOverdueFinesPolicies: {
    internal: 'ui-circulation.settings.overdue-fines-policies',
    gui: 'Settings (Circ): Can create, edit and remove overdue fine policies',
  },
  uiCirculationSettingsLostItemFeesPolicies: {
    internal: 'ui-circulation.settings.lost-item-fees-policies',
    gui: 'Settings (Circ): Can create, edit and remove lost item fee policies',
  },
  settingsLoanPoliciesAll: {
    internal: 'settings.loan-policies.all',
    gui: 'Settings (Circ): Can create, edit and remove loan policies [LEGACY]',
  },

  // Lists
  listsAll: {
    internal: 'module.lists.all',
    gui: 'Lists (Admin): All permissions',
  },
};
