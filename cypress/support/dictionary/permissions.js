export default {
  auditConfigGroupsCollectionGet: {
    internal: 'audit.config.groups.collection.get',
    gui: 'Audit Configuration - get settings groups',
  },
  auditConfigGroupsSettingsCollectionGet: {
    internal: 'audit.config.groups.settings.collection.get',
    gui: 'Audit Configuration - get settings for a group',
  },
  auditConfigGroupsSettingsAuditInventoryCollectionGet: {
    internal: 'audit.config.groups.settings.audit.inventory.collection.get',
    gui: 'Audit Configuration - get settings for a audit inventory group',
  },
  auditConfigGroupsSettingsItemPut: {
    internal: 'audit.config.groups.settings.item.put',
    gui: 'Audit Configuration - update setting for a group',
  },
  auditConfigGroupsSettingsAuditInventoryEnabledItemPut: {
    internal: 'audit.config.groups.settings.audit.inventory.enabled.item.put',
    gui: 'Audit Configuration - enable/disable audit inventory records',
  },
  // bulk edit
  bulkEditView: {
    internal: 'ui-bulk-edit.inventory.view',
    gui: 'Bulk Edit: In app - View inventory records',
  },
  bulkEditEdit: {
    internal: 'ui-bulk-edit.inventory.edit',
    gui: 'Bulk Edit: In app - Edit inventory records',
  },
  bulkEditCsvView: {
    internal: 'ui-bulk-edit.users.csv.view',
    gui: 'Bulk Edit: Local - View user records',
  },
  bulkEditCsvEdit: {
    internal: 'ui-bulk-edit.users.csv.edit',
    gui: 'Bulk Edit: Local - Edit user records',
  },
  bulkEditUpdateRecords: {
    internal: 'ui-bulk-edit.users.edit',
    gui: 'Bulk edit: In app - Edit user records',
  },
  bulkEditQueryView: { internal: 'ui-bulk-edit.query.execute', gui: 'Bulk edit: Can build query' },
  bulkEditLogsView: { internal: 'ui-bulk-edit.logs.view', gui: 'Bulk edit: Can view logs' },
  bulkEditSettingsCreate: {
    internal: 'ui-bulk-edit.settings.create',
    gui: 'Settings (Bulk edit): Can view, add, update profiles',
  },
  bulkEditSettingsView: {
    internal: 'ui-bulk-edit.settings.view',
    gui: 'Settings (Bulk edit): Can view only',
  },
  bulkEditSettingsDelete: {
    internal: 'ui-bulk-edit.settings.delete',
    gui: 'Settings (Bulk edit): Can delete profiles',
  },
  bulkEditSettingsLockEdit: {
    internal: 'ui-bulk-edit.settings.lock.edit',
    gui: 'Settings (Bulk edit): Can lock and unlock profiles',
  },

  // eHoldings
  uieHoldingsRecordsEdit: {
    internal: 'ui-eholdings.records.edit',
    gui: 'eHoldings: Can edit providers, packages, titles detail records',
  },
  uieHoldingsTitlesPackagesCreateDelete: {
    internal: 'ui-eholdings.titles-packages.create-delete.manage',
    gui: 'eHoldings: Can create and delete custom packages and titles',
  },
  uieHoldingsPackageTitleSelectUnselect: {
    internal: 'ui-eholdings.package-title.select-unselect.execute',
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
    internal: 'ui-notes.item.assign-unassign.execute',
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
    internal: 'ui-agreements.agreements.file.download',
    gui: 'Agreements: File download',
  },
  // QuickMarc
  uiQuickMarcQuickMarcHoldingsEditorCreate: {
    internal: 'ui-quick-marc.quick-marc-holdings-editor.create',
    gui: 'quickMARC: Create a new MARC holdings record',
  },
  uiQuickMarcQuickMarcBibliographicEditorCreate: {
    internal: 'ui-quick-marc.quick-marc-editor.create',
    gui: 'quickMARC: Create a new MARC bibliographic record',
  },
  uiQuickMarcQuickMarcEditorDuplicate: {
    internal: 'ui-quick-marc.quick-marc-editor.derive.execute',
    gui: 'quickMARC: Derive new MARC bibliographic record',
  },
  uiQuickMarcQuickMarcBibliographicEditorAll: {
    internal: 'ui-quick-marc.quick-marc-editor.all',
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
    internal: 'ui-quick-marc.quick-marc-authority-records.link-unlink.execute',
    gui: 'quickMARC: Can Link/unlink authority records to bib records',
  },
  uiQuickMarcQuickMarcAuthorityCreate: {
    internal: 'ui-quick-marc.quick-marc-authorities-editor.create',
    gui: 'quickMARC: Create a new MARC authority record',
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
  uiMarcAuthoritiesAuthorityRecordCreate: {
    internal: 'ui-marc-authorities.authority-record.create',
    gui: 'MARC Authority: Create new MARC authority record',
  },
  marcRecordsEditorAll: {
    internal: 'marc-records-editor.all',
    gui: 'All marc-records-editor permissions',
  },
  // Inventory
  inventoryAll: {
    internal: 'ui-inventory.all',
    gui: 'Inventory: All permissions',
  },
  uiCallNumberBrowse: {
    internal: 'ui-inventory.call-number-browse.view',
    gui: 'Call number browse: View permissions ',
  },
  uiSubjectBrowse: {
    internal: 'ui-inventory.subjects.view',
    gui: 'Subject browse: View permissions',
  },
  uiInventoryUpdateOwnership: {
    internal: 'consortia.inventory.update-ownership.item.post',
    gui: 'Inventory: Update ownership',
  },
  uiInventorySingleRecordImport: {
    internal: 'ui-inventory.single-record-import',
    gui: 'Inventory: Import single bibliographic records',
  },
  uiInventoryCreateOrderFromInstance: {
    internal: 'ui-inventory.instance.order.create',
    gui: 'Inventory: Create order from instance',
  },
  uiInventoryMarkItemsWithdrawn: {
    internal: 'ui-inventory.items.mark-withdrawn.execute',
    gui: 'Inventory: Mark items withdrawn',
  },
  uiInventoryViewInstances: {
    internal: 'ui-inventory.instance.view',
    gui: 'Inventory: View instances, holdings, and items',
  },
  uiInventoryViewCreateInstances: {
    internal: 'ui-inventory.instance.create',
    gui: 'Inventory: View, create instances',
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
    internal: 'ui-inventory.item.mark-as-missing.execute',
    gui: 'Inventory: View, create, edit, mark missing items',
  },
  uiInventoryMoveItems: { internal: 'ui-inventory.item.move', gui: 'Inventory: Move items' },
  uiInventoryViewCreateEditHoldings: {
    internal: 'ui-inventory.holdings.edit',
    gui: 'Inventory: View, create, edit holdings',
  },
  uiInventoryViewCreateHoldings: {
    internal: 'ui-inventory.holdings.create',
    gui: 'Inventory: View, create holdings',
  },
  uiInventoryViewCreateEditInstances: {
    internal: 'ui-inventory.instance.edit',
    gui: 'Inventory: View, create, edit instances',
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
    internal: 'ui-inventory.items.mark-in-process-non-requestable.execute',
    gui: 'Inventory: Mark items in process (non-requestable)',
  },
  uiInventoryMarcItemInProcessDefault: {
    internal: 'ui-inventory.items.mark-in-process.execute',
    gui: 'Inventory: Mark items in process',
  },
  uiInventoryMarcItemIntellectual: {
    internal: 'ui-inventory.items.mark-intellectual-item.execute',
    gui: 'Inventory: Mark items intellectual item',
  },
  uiInventoryMarcItemLongMissing: {
    internal: 'ui-inventory.items.mark-long-missing.execute',
    gui: 'Inventory: Mark items long missing',
  },
  uiInventoryMarcItemRestricted: {
    internal: 'ui-inventory.items.mark-restricted.execute',
    gui: 'Inventory: Mark items restricted',
  },
  uiInventoryMarcItemUnavailable: {
    internal: 'ui-inventory.items.mark-unavailable.execute',
    gui: 'Inventory: Mark items unavailable',
  },
  uiInventoryMarcItemUnknow: {
    internal: 'ui-inventory.items.mark-unknown.execute',
    gui: 'Inventory: Mark items unknown',
  },
  uiCreateEditDeleteURL: {
    internal: 'ui-inventory.settings.electronic-access-relationships',
    gui: 'Settings (Inventory): Create, edit, delete URL relationships',
  },
  uiInventorySetRecordsForDeletion: {
    internal: 'ui-inventory.instance.set-records-for-deletion.execute',
    gui: 'Inventory: Set records for deletion',
  },
  inventoryCRUDHoldings: {
    internal: 'ui-inventory.holdings.delete',
    gui: 'Inventory: View, create, edit, delete holdings',
  },
  inventoryCRUDHoldingsNoteTypes: {
    internal: 'ui-inventory.settings.holdings-note-types',
    gui: 'Settings (Inventory): Create, edit, delete holdings note types',
  },
  inventoryCRUDHoldingsTypes: {
    internal: 'ui-inventory.settings.holdings-types',
    gui: 'Settings (Inventory): Create, edit, delete holdings types',
  },
  inventoryCRUDHoldingsSources: {
    internal: 'ui-inventory.settings.holdings-sources',
    gui: 'Settings (Inventory): Create, edit, delete holdings sources',
  },
  inventoryCRUDItemNoteTypes: {
    internal: 'ui-inventory.settings.item-note-types',
    gui: 'Settings (Inventory): Create, edit, delete item note types',
  },
  notesSettingsViewGeneralSettings: {
    internal: 'ui-notes.settings.view',
    gui: 'Settings (Notes): View General settings',
  },
  crudAlternativeTitleTypes: {
    internal: 'ui-inventory.settings.alternative-title-types',
    gui: 'Settings (Inventory): Create, edit, delete alternative title types',
  },
  crudClassificationIdentifierTypes: {
    internal: 'ui-inventory.settings.classification-types',
    gui: 'Settings (Inventory): Create, edit, delete classification identifier types',
  },
  crudInstanceNoteTypes: {
    internal: 'ui-inventory.settings.instance-note-types',
    gui: 'Settings (Inventory): Create, edit, delete instance note types',
  },
  crudNatureOfContent: {
    internal: 'ui-inventory.settings.nature-of-content-terms',
    gui: 'Settings (Inventory): Create, edit, delete nature of content',
  },
  crudContributorTypes: {
    internal: 'ui-inventory.settings.contributor-types',
    gui: 'Settings (Inventory): Create, edit, delete contributor types',
  },
  crudFormats: {
    internal: 'ui-inventory.settings.instance-formats',
    gui: 'Settings (Inventory): Create, edit, delete formats',
  },
  crudDefinedResourceTypes: {
    internal: 'ui-inventory.settings.instance-types',
    gui: 'Settings (Inventory): Create, edit, delete locally defined resource types',
  },
  crudResourceIdentifierTypes: {
    internal: 'ui-inventory.settings.identifier-types',
    gui: 'Settings (Inventory): Create, edit, delete resource identifier types',
  },
  enableStaffSuppressFacet: {
    internal: 'ui-inventory.instance.staff-suppressed-records.view',
    gui: 'Inventory: Enable staff suppress facet',
  },
  patchInstanceDateTypes: {
    internal: 'inventory-storage.instance-date-types.item.patch',
    gui: 'inventory storage - patch instance-date-type',
  },
  getInstanceDateTypes: {
    internal: 'inventory-storage.instance-date-types.collection.get',
    gui: 'inventory storage - get list of instance-date-types',
  },
  inventoryViewEditGeneralSettings: {
    internal: 'ui-inventory.settings.displaySettings',
    gui: 'Settings (Inventory): Can view and edit general settings',
  },
  // TODO: move to capability when it will be implemented
  inventoryCreateAndDownloadInTransitItemsReport: {
    internal: 'ui-inventory.items.in-transit-report.create',
    gui: 'Inventory: Create and download In transit items report',
  },
  inventoryStorageBatchCreateUpdateItems: {
    internal: 'inventory-storage.items.batch.post',
    gui: 'inventory storage - create or update a number of items',
  },
  inventoryStorageBatchUpdateItemsPatch: {
    internal: 'inventory-storage.items.collection.patch',
    gui: 'inventory storage - update items collection',
  },
  inventoryFastAddCreate: {
    internal: 'ui-plugin-create-inventory-records.create',
    gui: 'Fast add: Create',
  },
  inventoryStorageHoldingsBatchUpdate: {
    internal: 'inventory-storage.holdings.batch.post',
    gui: 'inventory storage - create or update a number of holdings',
  },
  // Tags
  uiTagsPermissionAll: { internal: 'ui-tags.all', gui: 'Tags: All permissions' },
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
    internal: 'ui-users.settings.owners.all',
    gui: 'Settings (Users): Can create, edit and remove owners',
  },
  uiUsersEdituserservicepoints: {
    internal: 'ui-users.user-service-points.edit',
    gui: 'Users: Can assign and unassign service points to users',
  },
  // Locations
  uiTenantSettingsSettingsLocation: {
    internal: 'ui-tenant-settings.settings.location',
    gui: 'Settings (tenant): Can create, edit and remove locations',
  },
  uiTenantSettingsServicePointsCRUD: {
    internal: 'ui-tenant-settings.settings.servicepoints',
    gui: 'Settings (tenant): Can create and edit service points',
  },
  // DataImport
  dataImportUploadAll: {
    internal: 'data-import.upload.all',
    gui: 'Data Import File Upload - all permissions',
  },
  moduleDataImportEnabled: {
    internal: 'ui-data-import.manage',
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

  // Specification Storage
  specificationStorageGetSpecificationFields: {
    internal: 'specification-storage.specification.fields.collection.get',
    gui: 'Specification Storage - Get specification field definition collection',
  },
  specificationStorageCreateSpecificationField: {
    internal: 'specification-storage.specification.fields.item.post',
    gui: 'Specification Storage - Create field definition for specification',
  },
  specificationStorageUpdateSpecificationField: {
    internal: 'specification-storage.fields.item.put',
    gui: 'Specification Storage - Update field definition',
  },
  specificationStorageDeleteSpecificationField: {
    internal: 'specification-storage.fields.item.delete',
    gui: 'Specification Storage - Delete specification field definition',
  },
  specificationStorageGetSpecificationFieldIndicators: {
    internal: 'specification-storage.field.indicators.collection.get',
    gui: 'Specification Storage - Get field indicators definition collection',
  },
  specificationStorageCreateSpecificationFieldIndicator: {
    internal: 'specification-storage.field.indicators.item.post',
    gui: 'Specification Storage - Create indicator definition for field',
  },
  specificationStorageUpdateSpecificationFieldIndicator: {
    internal: 'specification-storage.indicators.item.put',
    gui: 'Specification Storage - Update indicator definition',
  },
  specificationStorageGetSpecificationIndicatorCodes: {
    internal: 'specification-storage.indicator.indicator-codes.collection.get',
    gui: 'Specification Storage - Get indicator code definition collection',
  },
  specificationStorageCreateSpecificationIndicatorCode: {
    internal: 'specification-storage.indicator.indicator-codes.item.post',
    gui: 'Specification Storage - Create code definition for indicator',
  },
  specificationStorageUpdateSpecificationIndicatorCode: {
    internal: 'specification-storage.indicator-codes.item.put',
    gui: 'Specification Storage - Update indicator code definition',
  },
  specificationStorageDeleteSpecificationIndicatorCode: {
    internal: 'specification-storage.indicator-codes.item.delete',
    gui: 'Specification Storage - Delete indicator code definition',
  },
  specificationStorageGetSpecificationFieldSubfields: {
    internal: 'specification-storage.field.subfields.collection.get',
    gui: 'Specification Storage - Get field subfields definition collection',
  },
  specificationStorageCreateSpecificationFieldSubfield: {
    internal: 'specification-storage.field.subfields.item.post',
    gui: 'Specification Storage - Create subfield definition for field',
  },
  specificationStorageUpdateSpecificationSubfield: {
    internal: 'specification-storage.subfields.item.put',
    gui: 'Specification Storage - Update subfield definition',
  },
  specificationStorageSpecificationRulesItemPatch: {
    internal: 'specification-storage.specification.rules.item.patch',
    gui: 'Specification Storage - Toggle rule for specification',
  },
  specificationStorageSpecificationRulesCollectionGet: {
    internal: 'specification-storage.specification.rules.collection.get',
    gui: 'Specification Storage - Get specification rules collection',
  },
  specificationStorageSpecificationItemGet: {
    internal: 'specification-storage.specifications.item.get',
    gui: 'Specification Storage - Get specification',
  },
  specificationStorageSpecificationCollectionGet: {
    internal: 'specification-storage.specifications.collection.get',
    gui: 'Specification Storage - Get specification collection',
  },
  rtacGetBatchHoldingsCollection: {
    internal: 'rtac.batch.post',
    gui: 'RTAC - get batch holding collection',
  },

  // Circulation log
  circulationLogAll: { internal: 'ui-circulation-log.log-event.all', gui: 'Circulation log: All' },
  circulationLogView: {
    internal: 'ui-circulation-log.log-event.view',
    gui: 'Circulation log: View',
  },
  // Circulation
  uiCirculationViewCreateEditDelete: {
    internal: 'ui-circulation.settings.edit-circulation-rules',
    gui: 'Settings (Circulation): Can create, edit and remove circulation rules',
  },
  uiCirculationSettingsNoticeTemplates: {
    internal: 'ui-circulation.settings.notice-templates',
    gui: 'Settings (Circulation): Can create, edit and remove patron notice templates',
  },
  uiCirculationSettingsNoticePolicies: {
    internal: 'ui-circulation.settings.notice-policies',
    gui: 'Settings (Circulation): Can create, edit and remove notice policies',
  },
  uiCirculationSettingsOtherSettings: {
    internal: 'ui-circulation.settings.other-settings',
    gui: 'Settings (Circulation): Can create, edit and remove other settings',
  },
  uiCirculationCreateEditRemoveStaffSlips: {
    internal: 'ui-circulation.settings.staff-slips',
    gui: 'Settings (Circulation): Can create, edit and remove staff slips',
  },
  uiCirculationCreateViewOverdueFinesPolicies: {
    internal: 'ui-circulation.settings.view-overdue-fines-policies',
    gui: 'Settings (Circulation): Can view overdue fine policies',
  },
  uiCirculationViewCreateEditDeleteFixedDueDateSchedules: {
    internal: 'ui-circulation.settings.fixed-due-date-schedules',
    gui: 'Settings (Circulation): Can create, edit and remove fixed due date schedules',
  },
  uiCirculationViewLoanHistory: {
    internal: 'ui-circulation.settings.loan-history',
    gui: 'Settings (Circulation): Can view loan history',
  },
  uiCirculationEditLoanHistory: {
    internal: 'ui-circulation.settings.edit-loan-history',
    gui: 'Settings (Circulation): Can edit loan history',
  },
  // Users
  usersViewRequests: { internal: 'ui-users.requests.all', gui: 'Users: View requests' },
  uiUsersView: { internal: 'ui-users.view', gui: 'Users: Can view user profile' },
  uiUsersPermissionsView: {
    internal: 'ui-users.perms.view',
    gui: 'Users: Can view permissions assigned to users',
  },
  uiUsersCreate: { internal: 'ui-users.create', gui: 'Users: Can create and edit users' },
  uiUserEdit: { internal: 'ui-users.edit', gui: 'Users: Can edit user profile' },
  uiUserProxies: {
    internal: 'ui-users.proxies.all',
    gui: 'Users: Can create, edit and remove proxies',
  },
  uiUsersDelete: {
    internal: 'ui-users.delete',
    gui: 'Users: Can delete user profile if user does not have any open transactions',
  },
  uiUsersCreateResetPassword: {
    internal: 'ui-users.reset.password',
    gui: 'Users: Create/reset password',
  },
  uiUsersCheckTransactions: {
    internal: 'ui-users.open-transactions.view',
    gui: 'Users: Can check open transactions',
  },
  uiUserAccounts: {
    internal: 'ui-users.accounts.all',
    gui: 'Fee/Fine History: Can create, edit and remove accounts',
  },
  uiUsersViewLoans: { internal: 'ui-users.loans.view', gui: 'Users: User loans view' },
  uiUserLoansAnonymize: {
    internal: 'ui-users.loans-anonymize.execute',
    gui: 'Users: User loans anonymize',
  },
  uiUserLostItemRequiringActualCost: {
    internal: 'ui-users.lost-items-requiring-actual-cost.execute',
    gui: 'Users: Can process lost items requiring actual cost',
  },
  uiFeeFinesActions: {
    internal: 'ui-users.fee-fine-actions.all',
    gui: 'Fee/Fine Details: Can create, edit and remove fee/fine actions',
  },
  uiFeeFinesCanWaive: {
    internal: 'ui-users.manual-waive.execute',
    gui: 'Fees/Fines: Can waive',
  },
  uiFeeFines: {
    internal: 'ui-users.feesfines.actions.all',
    gui: 'Users: Can create, edit and remove fees/fines',
  },
  uiUsersLoansClaimReturned: {
    internal: 'ui-users.loans-claim-item-returned.execute',
    gui: 'Users: User loans claim returned',
  },
  uiUsersLoansClaimReturnedMissing: {
    internal: 'ui-users.loans-declare-claimed-returned-item-as-missing.execute',
    gui: 'Users: User loans mark claimed returned missing',
  },
  uiUsersDeclareItemLost: {
    internal: 'ui-users.loans-declare-item-lost.execute',
    gui: 'Users: User loans declare lost',
  },
  usersLoansRenewThroughOverride: {
    internal: 'ui-users.loans-renew-override.create',
    gui: 'Users: User loans renew through override',
  },
  uiUserCanAssignUnassignPermissions: {
    internal: 'ui-users.perms.edit',
    gui: 'Users: Can assign and unassign permissions to users',
  },
  uiUsersfeefinesView: {
    internal: 'ui-users.feesfines.view',
    gui: 'Users: Can view fees/fines and loans',
  },
  uiUsersManualCharge: {
    internal: 'ui-users.manual-charge.execute',
    gui: 'Fees/Fines: Can charge',
  },
  uiUsersManualPay: { internal: 'ui-users.manual-pay.execute', gui: 'Fees/Fines: Can pay' },
  uiUsersViewServicePoints: {
    internal: 'ui-users.user-service-points.view',
    gui: 'Users: Can view service points assigned to users',
  },
  uiUsersfeefinesCRUD: {
    internal: 'ui-users.feesfines.actions.all',
    gui: 'Users: Can create, edit and remove fees/fines',
  },
  feesfinesCheckPay: {
    internal: 'feesfines.accounts.check-pay.post',
    gui: 'accounts payment check post',
  },
  feesfinesPay: {
    internal: 'feesfines.accounts.pay.post',
    gui: 'accounts payment post',
  },
  uiUsersPatronBlocks: {
    internal: 'ui-users.patron-blocks.all',
    gui: 'Users: Can create, edit and remove patron blocks',
  },
  uiUsersCreatePatronTamplate: {
    internal: 'ui-users.settings.patron-block-templates.all',
    gui: 'Settings (Users): Can create, edit and remove patron blocks templates',
  },
  uiUsersViewPatronGroups: {
    internal: 'ui-users.settings.usergroups.view',
    gui: 'Settings (Users): Can view patron groups',
  },
  uiUsersCreateEditRemovePatronGroups: {
    internal: 'ui-users.settings.usergroups.all',
    gui: 'Settings (Users): Can create, edit and remove patron groups',
  },
  uiUsersCreatePatronLimits: {
    internal: 'ui-users.settings.limits.all',
    gui: 'Settings (Users): Can create, edit and remove patron blocks limits',
  },
  uiUsersCreatePatronConditions: {
    internal: 'ui-users.settings.conditions.edit',
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
    internal: 'ui-users.loans-due-date.edit',
    gui: 'Users: User loans change due date',
  },
  uiUserFinancialTransactionReport: {
    internal: 'ui-users.financial-transaction-report.execute',
    gui: 'Users: Create and download Financial transaction detail report',
  },
  uiUserViewEditDeliteProfilePictores: {
    internal: 'ui-users.profile-pictures.all',
    gui: 'Users: Can view, edit, and delete profile pictures',
  },
  uiUserViewProfilePictores: {
    internal: 'ui-users.profile-pictures.view',
    gui: 'Users: Can view profile pictures',
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
  uiRequestsMediatedAll: { internal: 'ui-requests-mediated.all', gui: 'UI-Requests-Mediated' },
  uiRequestsCreate: { internal: 'ui-requests.create', gui: 'Requests: View, create' },
  uiRequestsView: { internal: 'ui-requests.view', gui: 'Requests: View' },
  uiRequestsEdit: { internal: 'ui-requests.edit', gui: 'Requests: View, edit, cancel' },
  tlrEdit: {
    internal: 'ui-circulation.settings.titleLevelRequests',
    gui: 'Settings (Circulation): Title level request edit',
  },
  uiMoveRequest: {
    internal: 'ui-requests.moveRequest.execute',
    gui: 'Requests: Move to new item, reorder queue',
  },
  uiRequestsReorderQueue: {
    internal: 'ui-requests.reorderQueue.execute',
    gui: 'Requests: Reorder queue',
  },
  // Calendar
  calendarView: {
    internal: 'ui-calendar.view',
    gui: 'Settings (Calendar): Can view existing calendars',
  },
  calendarCreate: {
    internal: 'ui-calendar.create',
    gui: 'Settings (Calendar): Can create and assign new calendars',
  },
  calendarDelete: {
    internal: 'ui-calendar.delete',
    gui: 'Settings (Calendar): Can delete existing calendars',
  },
  calendarEditCalendars: {
    internal: 'ui-calendar.update',
    gui: 'Settings (Calendar): Can edit and reassign existing calendars',
  },
  // Data Export
  dataExportViewAddUpdateProfiles: {
    internal: 'ui-data-export.settings.edit',
    gui: 'Settings (Data export): Can view, add, update profiles',
  },
  dataExportSettingsViewOnly: {
    internal: 'ui-data-export.settings.view',
    gui: 'Settings (Data export): Can view only',
  },
  dataExportViewOnly: {
    internal: 'ui-data-export.view',
    gui: 'Data export: Can view only',
  },
  dataExportUploadExportDownloadFileViewLogs: {
    internal: 'ui-data-export.edit',
    gui: 'Data export: Can upload files, export, download files and view logs',
  },
  // TODO: move to capability when it will be implemented
  consortiaCentralAll: {
    internal: 'consortia.data-import.central-record-update.all',
    gui: 'All Data Import shared record update permissions',
  },

  // Loans
  loansAll: {
    internal: 'ui-users.loans.all',
    gui: 'Users: User loans view, change due date, renew',
  },
  loansView: { internal: 'ui-users.loans.view', gui: 'Users: User loans view' },
  loansRenew: { internal: 'ui-users.loans-renew.create', gui: 'Users: User loans renew' },
  loansRenewOverride: {
    internal: 'ui-users.loans-renew-override.create',
    gui: 'Users: User loans renew through override',
  },
  overridePatronBlock: {
    internal: 'ui-users.override-patron-block.execute',
    gui: 'User: Can override patron blocks',
  },
  // Checkout
  checkoutAll: { internal: 'ui-checkout.all', gui: 'Check out: All permissions' },
  checkoutCirculatingItems: {
    internal: 'ui-checkout.circulation.execute',
    gui: 'Check out: Check out circulating items',
  },
  checkoutViewFeeFines: {
    internal: 'ui-checkout.viewFeeFines.view',
    gui: 'Check out: View fees/fines',
  },
  // Checkin
  checkinAll: { internal: 'ui-checkin.all', gui: 'Check in: All permissions' },
  // Receiving
  uiReceivingView: {
    internal: 'ui-receiving.view',
    gui: 'Receiving: View',
  },
  uiReceivingViewEditCreate: {
    internal: 'ui-receiving.create',
    gui: 'Receiving: View, edit, create',
  },
  uiReceivingViewEditDelete: {
    internal: 'ui-receiving.delete',
    gui: 'Receiving: View, edit, delete',
  },
  uiReceivingExportSearchResults: {
    internal: 'ui-receiving.exportCSV',
    gui: 'Receiving: Export search results',
  },
  uiReceivingAssignAcquisitionUnitsToNewTitle: {
    internal: 'ui-receiving.acq-units.assignment.assign',
    gui: 'Receiving: Assign acquisition units to new receiving title',
  uiReceivingManageAcquisitionUnits: {
    internal: 'ui-receiving.acq-units.assignment.manage',
    gui: 'Receiving: Manage acquisition units',
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
    gui: 'Invoice: Assign acquisitions units to new record',
  },
  uiInvoicesApproveInvoices: {
    internal: 'ui-invoice.invoice.approve.execute',
    gui: 'Invoice: Approve invoices',
  },
  uiInvoicesPayInvoices: {
    internal: 'ui-invoice.invoice.pay.execute',
    gui: 'Invoice: Pay invoices',
  },
  uiInvoicesPayInvoicesInDifferentFiscalYear: {
    internal: 'ui-invoice.invoice.pay-different-fy.execute',
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
  invoiceSettingsBatchGroupView: {
    internal: 'ui-invoice.batchVoucher.exportConfigs.credentials.view',
    gui: 'Settings (Invoices): Batch group usernames and passwords: view',
  },
  uiInvoicesCancelInvoices: {
    internal: 'ui-invoice.invoice.cancel.execute',
    gui: 'Invoice: Cancel invoices',
  },
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
  uiInvoicesVoucherExport: {
    internal: 'ui-invoice.voucher.export.execute',
    gui: 'Invoice: Voucher export',
  },
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
    internal: 'ui-finance.group.view',
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
    internal: 'ui-finance.ledger.rollover.execute',
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
    internal: 'ui-finance.encumbrance.release-manually.execute',
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
  uiFinanceUnreleaseEncumbrance: {
    internal: 'ui-finance.encumbrance.unrelease.execute',
    gui: 'Finance: Unrelease encumbrance',
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
  uiFinanceViewEditDeleteFundBudget: {
    internal: 'ui-finance.fund-budget.delete',
    gui: 'Finance: View, edit, delete fund and budget',
  },
  uiFinanceViewEditDeleteGroups: {
    internal: 'ui-finance.group.delete',
    gui: 'Finance: View, edit, delete group',
  },
  uiFinanceViewEditDeleteLedger: {
    internal: 'ui-finance.ledger.delete',
    gui: 'Finance: View, edit, delete ledger',
  },
  uiSettingsFinanceViewEditCreateDelete: {
    internal: 'ui-finance.settings.all',
    gui: 'Settings (Finance): View, edit, create, delete',
  },
  uiSettingsFinanceView: {
    internal: 'ui-finance.settings.view',
    gui: 'Settings (Finance): View settings',
  },
  uiSettingsFinanceExportFundAndExpenseClassCodes: {
    internal: 'ui-finance.settings.exportFundAndExpenseClassCodes',
    gui: 'Settings (Finance): Export fund and expense class codes',
  },
  uiFinanceAssignAcquisitionUnitsToNewRecord: {
    internal: 'ui-finance.acq.unit.assignment.assign',
    gui: 'Finance: Assign acquisition units to new record',
  },
  uiFinanceFundUpdateLogsView: {
    internal: 'ui-finance.fund-update-logs.view',
    gui: 'Finance: View batch allocation logs',
  },
  uiFinanceFundUpdateLogsDelete: {
    internal: 'ui-finance.fund-update-logs.delete',
    gui: 'Finance: Delete batch allocation logs',
  },
  // Organizations
  uiOrganizationsViewEditCreateDeletePrivilegedDonorInformation: {
    internal: 'ui-organizations.privileged-contacts.edit',
    gui: 'Organizations: can view, create, edit, delete privileged donor information',
  },
  uiOrganizationsAssignAcquisitionUnitsToNewOrganization: {
    internal: 'ui-organizations.acqUnits.assign',
    gui: 'Organizations: Assign acquisition units to new organization',
  },
  uiOrganizationsViewBankingInformation: {
    internal: 'ui-organizations.banking-information.view',
    gui: 'Organizations: View banking information',
  },
  uiOrganizationsViewAndEditBankingInformation: {
    internal: 'ui-organizations.banking-information.edit',
    gui: 'Organizations: View and edit banking information',
  },
  uiOrganizationsViewEditAndCreateBankingInformation: {
    internal: 'ui-organizations.banking-information.create',
    gui: 'Organizations: View, edit and create banking information',
  },
  uiOrganizationsViewEditCreateAndDeleteBankingInformation: {
    internal: 'ui-organizations.banking-information.delete',
    gui: 'Organizations: View, edit, create and delete banking information',
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
  uiSettingsAcquisitionUnitsView: {
    internal: 'ui-acquisition-units.settings.view',
    gui: 'Settings (acquisition units): View acquisition units',
  },
  uiSettingsAcquisitionUnitsViewEditCreateDelete: {
    internal: 'ui-acquisition-units.settings.all',
    gui: 'Settings (acquisition units): Can view, edit, create and delete acquisition units',
  },
  uiSettingsAcquisitionUnitsManageAcqUnitUserAssignments: {
    internal: 'ui-acquisition-units.settings.userAssignments',
    gui: 'Settings (acquisition units): Manage acquisition unit user assignments',
  },
  uiInventorySettingsFastAdd: {
    internal: 'ui-inventory.settings.fast-add',
    gui: 'Settings (Inventory): Edit fast add settings',
  },
  uiCreateEditDeleteLoanTypes: {
    internal: 'ui-inventory.settings.loan-types',
    gui: 'Settings (Inventory): Create, edit, delete loan types',
  },
  uiCreateEditDeleteMaterialTypes: {
    internal: 'ui-inventory.settings.material-types',
    gui: 'Settings (Inventory): Create, edit, delete material types',
  },
  uiInventorySettingsConfigureSingleRecordImport: {
    internal: 'ui-inventory.settings.single-record-import',
    gui: 'Settings (Inventory): Configure single-record import',
  },
  uiInventorySettingsConfigureClassificationBrowse: {
    internal: 'ui-inventory.settings.classification-browse',
    gui: 'Settings (Inventory): Configure classification browse',
    details: ['absentInEvrk'],
  },
  settingsDataImportView: {
    internal: 'ui-data-import.view',
    gui: 'Data import: Can view only',
  },
  settingsDataImportEnabled: {
    internal: 'ui-data-import.settings.manage',
    gui: 'Settings (Data import): Can view, create, edit, and remove',
  },
  settingsDataImportCanViewOnly: {
    internal: 'ui-data-import.settings.readOnly',
    gui: 'Settings (Data import): Can view only',
  },
  settingsTenantViewLocation: {
    internal: 'ui-tenant-settings.settings.location.view',
    gui: 'Settings (Tenant): View locations',
  },
  settingsTenantView: {
    internal: 'ui-tenant-settings.settings.view',
    gui: 'Settings (tenant): View',
  },
  settingsCircView: {
    internal: 'ui-circulation.settings.cancellation-reasons',
    gui: 'Settings (Circulation): Can create, edit and remove cancellation reasons',
  },
  settingsCircCRUDRequestPolicies: {
    internal: 'ui-circulation.settings.request-policies',
    gui: 'Settings (Circulation): Can create, edit and remove request policies',
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
  uiSettingsStatisticalCodeTypesCreateEditDelete: {
    internal: 'ui-inventory.settings.statistical-code-types',
    gui: 'Settings (Inventory): Create, edit, delete statistical code types',
  },
  uiSettingsHRIDHandlingCreateEditDelete: {
    internal: 'ui-inventory.settings.hrid-handling',
    gui: 'Settings (Inventory): Create, edit and delete HRID handling',
  },
  uiSettingsCallNumberBrowseView: {
    internal: 'ui-inventory.settings.call-number-browse',
    gui: 'Settings (Inventory): Configure call number browse',
  },
  uiSettingsCallNumberTypesCreateEditDelete: {
    internal: 'ui-inventory.settings.call-number-types',
    gui: 'Settings (Inventory): Create, edit, delete call number types',
  },
  uiSettingsManageAuthorityFiles: {
    internal: 'ui-marc-authorities.settings.authority-files.all',
    gui: 'Settings (MARC authority): View, create, edit, delete authority files',
  },
  uiSettingsModesOfIssuanceCreateEditDelete: {
    internal: 'ui-inventory.settings.modes-of-issuance',
    gui: 'Settings (Inventory): Create, edit, delete locally defined modes of issuance',
  },
  uiSettingsSubjectSourceCreateEditDelete: {
    internal: 'ui-inventory.settings.subject-sources',
    gui: 'Settings (Inventory): Create, edit, delete subject sources',
  },
  uiSettingsCreateEditDeleteSubjectTypes: {
    internal: 'ui-inventory.settings.subject-types',
    gui: 'Settings (Inventory): Create, edit, delete subject types',
  },
  uiSettingsViewAuthorityFiles: {
    internal: 'ui-marc-authorities.settings.authority-files.view',
    gui: 'Settings (MARC authority): View authority files',
  },
  uiSettingsInventoryViewList: {
    internal: 'ui-inventory.settings.list.view',
    gui: 'Settings (Inventory): View list of settings pages',
  },
  // Added the below permissions for custom label creation

  uiSettingsEHoldingsViewAccessStatusTypes: {
    internal: 'ui-eholdings.settings.access-types.view',
    gui: 'Settings (eholdings): Can view access status types',
  },
  uiSettingsEHoldingsAccessStatusTypesAll: {
    internal: 'ui-eholdings.settings.access-types.all',
    gui: 'Settings (eholdings): Can create, edit, view, and delete access status types',
  },
  uiSettingsEHoldingsViewCustomLabel: {
    internal: 'ui-eholdings.settings.custom-labels.view',
    gui: 'Settings (eholdings): Can view custom labels',
  },
  uiSettingseholdingsViewEditCreateDelete: {
    internal: 'ui-eholdings.settings.custom-labels.edit',
    gui: 'Settings (eholdings): Can create, edit, view, and delete custom labels',
  },
  uiSettingsEHoldingsViewSettings: {
    internal: 'ui-eholdings.settings.enabled',
    gui: 'Settings (eHoldings): View settings',
  },
  uiSettingsEHoldingsAssignUsers: {
    internal: 'ui-eholdings.settings.assignedUser.edit',
    gui: 'Settings (eHoldings): Can assign/unassign a user from a KB',
  },
  uiSettingsEHoldingsRootProxyEdit: {
    internal: 'ui-eholdings.settings.root-proxy.edit',
    gui: 'Settings (eHoldings): configure root proxy setting',
  },
  uiSettingsEHoldingsUsageConsolidationView: {
    internal: 'ui-eholdings.settings.usage-consolidation.view',
    gui: 'Settings (eholdings): View Usage Consolidation API credentials',
  },
  uiSettingsDeveloperSessionLocale: {
    internal: 'ui-developer.settings.locale',
    gui: 'Settings (Developer): set session locale',
  },
  uiSettingsTenantReadingRoomAll: {
    internal: 'ui-tenant-settings.settings.reading-room-access.all',
    gui: 'Settings (tenant): Can create, edit and remove reading room access',
  },

  uiSettingsTenantReadingRoom: {
    internal: 'ui-tenant-settings.settings.reading-room-access.view',
    gui: 'Settings (tenant): Can view reading room access',
    details: ['absentInEvrk'],
  },
  uiCanViewReadingRoomAccess: {
    internal: 'ui-users.reading-room-access.view',
    gui: 'Users: Can view reading room access',
  },
  uiCanViewEditReadingRoomAccess: {
    internal: 'ui-users.reading-room-access.edit',
    gui: 'Users: Can view, and edit reading room access',
  },
  uiReadingRoomAll: {
    internal: 'ui-reading-room.all',
    gui: 'Reading room access: In app - track access',
  },
  // Timers
  okapiTimersPatch: {
    internal: 'okapi.proxy.self.timers.patch',
    gui: 'Okapi - patch timer for current tenant',
    details: ['noDisplayName'],
  },
  // Export manager
  exportManagerAll: {
    internal: 'ui-export-manager.export-manager.all',
    gui: 'Export manager: All',
  },
  exportManagerDownloadAndResendFiles: {
    internal: 'ui-export-manager.jobs.downloadAndResend.execute',
    gui: 'Export manager: Download and resend files',
  },
  exportManagerView: {
    internal: 'ui-export-manager.export-manager.view',
    gui: 'Export manager: View',
  },
  transferExports: {
    internal: 'ui-plugin-bursar-export.bursar-exports.all',
    gui: 'Transfer exports: Modify configuration and start jobs',
  },
  // OAI-PMH
  oaipmhView: {
    internal: 'ui-oai-pmh.settings.view',
    gui: 'Settings (OAI-PMH): Can view',
  },
  oaipmhViewLogs: {
    internal: 'ui-oai-pmh.settings.logs.view',
    gui: 'Settings (OAI-PMH): Can view logs',
  },
  oaipmhSettingsEdit: {
    internal: 'ui-oai-pmh.settings.edit',
    gui: 'Settings (OAI-PMH): Can view and edit settings',
  },
  uiCirculationSettingsOverdueFinesPolicies: {
    internal: 'ui-circulation.settings.overdue-fines-policies',
    gui: 'Settings (Circulation): Can create, edit and remove overdue fine policies',
  },
  uiCirculationSettingsLostItemFeesPolicies: {
    internal: 'ui-circulation.settings.lost-item-fees-policies',
    gui: 'Settings (Circulation): Can create, edit and remove lost item fee policies',
  },
  settingsLoanPoliciesAll: {
    internal: 'settings.loan-policies.all',
    gui: 'Settings (Circulation): Can create, edit and remove loan policies [LEGACY]',
  },
  // Consortia
  settingsConsortiaCanViewNetworkOrdering: {
    internal: 'ui-consortia-settings.settings.networkOrdering.view',
    gui: 'Settings (Consortia): Can view network ordering',
  },
  consortiaSettingsConsortiaAffiliationsEdit: {
    internal: 'ui-consortia-settings.consortia.affiliations.edit',
    gui: 'Consortia: Assign and unassign affiliations',
    details: ['obsolete'],
  },
  consortiaSettingsConsortiaAffiliationsView: {
    internal: 'ui-consortia-settings.consortia.affiliations.view',
    gui: 'Consortia: View affiliations',
    details: ['obsolete'],
  },
  consortiaInventoryShareLocalInstance: {
    internal: 'consortia.inventory.local.sharing-instances.execute',
    gui: 'Inventory: Share local instance with consortium',
    details: ['obsolete'],
  },
  consortiaSettingsSettingsMembershipEdit: {
    internal: 'ui-consortia-settings.settings.membership.edit',
    gui: 'Settings (Consortia): Can view and edit consortia membership',
    details: ['obsolete'],
  },
  consortiaSettingsSettingsMembershipView: {
    internal: 'ui-consortia-settings.settings.membership.view',
    gui: 'Settings (Consortia): Can view consortia membership',
    details: ['obsolete'],
  },
  // Consortium manager
  consortiaSettingsConsortiumManagerEdit: {
    internal: 'ui-consortia-settings.consortium-manager.edit',
    gui: 'Consortium manager: Can create, edit and remove settings',
    details: ['obsolete'],
  },
  consortiaSettingsConsortiumManagerShare: {
    internal: 'ui-consortia-settings.consortium-manager.share',
    gui: 'Consortium manager: Can share settings to all members',
    details: ['obsolete'],
  },
  consortiaSettingsConsortiumManagerView: {
    internal: 'ui-consortia-settings.consortium-manager.view',
    gui: 'Consortium manager: Can view existing settings',
    details: ['obsolete'],
  },
  consortiaSettingsConsortiumManagerDepartmentsCreateEditView: {
    internal: 'ui-users.settings.departments.create.edit.view',
    gui: 'Settings (Users): Can create, edit, and view departments',
    details: ['obsolete'],
  },
  consortiaSettingsConsortiumManagerPatronGroupsAll: {
    internal: 'ui-users.settings.usergroups.all',
    gui: 'Settings (Users): Can create, edit and remove patron groups',
  },
  // Lists
  listsAll: {
    internal: 'module.lists.all',
    gui: 'Lists (Admin): All permissions',
  },

  listsEnable: {
    internal: 'module.lists.enabled',
    gui: 'Lists (Enable): Can view lists',
  },

  listsEdit: {
    internal: 'module.lists.refresh',
    gui: 'Lists (Edit): Can create, edit, and refresh lists',
  },

  listsDelete: {
    internal: 'module.lists.delete',
    gui: 'Lists (Delete): Can create, edit, refresh, and delete lists',
  },

  listsExport: {
    internal: 'module.lists.export',
    gui: 'Lists (Export): Can create, edit, refresh, and export lists',
  },

  // Licenses
  licensesSearchAndView: {
    internal: 'ui-licenses.licenses.view',
    gui: 'Licenses: Search & view licenses',
  },

  // Courses
  coursesAll: {
    internal: 'ui-courses.all',
    gui: 'Courses: All permissions',
  },
  coursesReadAll: {
    internal: 'ui-courses.read-all',
    gui: 'Courses: Read all',
  },
  // Departments
  createEditViewDepartments: {
    internal: 'ui-users.settings.departments.create.edit.view',
    gui: 'Settings (Users): Can create, edit, and view departments',
  },
  departmentsAll: {
    internal: 'ui-users.settings.departments.all',
    gui: 'Settings (Users): Can create, edit, view, and delete departments',
  },

  ebsconetAll: {
    internal: 'ebsconet.all',
    gui: 'Ebsconet API module - all permissions',
  },
};
