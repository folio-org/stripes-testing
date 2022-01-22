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
  // QuickMarc
  uiQuickMarcQuickMarcHoldingsEditorCreate: { internal: 'ui-quick-marc.quick-marc-holdings-editor.create', gui: 'quickMARC: Create a new MARC holdings record' },
  uiQuickMarcQuickMarcEditorDuplicate: { internal: 'ui-quick-marc.quick-marc-editor.duplicate', gui: 'quickMARC: Derive new MARC bibliographic record' },
  uiQuickMarcQuickMarcAuthoritiesEditorAll: { internal: 'ui-quick-marc.quick-marc-authorities-editor.all', gui: 'quickMARC: View, edit MARC authorities record' },
  uiQuickMarcQuickMarcHoldingsEditorAll: { internal: 'ui-quick-marc.quick-marc-holdings-editor.all', gui: 'quickMARC: View, edit MARC holdings record' },
  uiQuickMarcQuickMarcBibliographicEditorAll: { internal: 'ui-quick-marc.quick-marc-bibliographic-editor.all', gui: 'quickMARC: View, edit MARC bibliographic record' },
  // Inventory
  // TODO: gui name related with several internal names. Clarify the reason
  inventoryAll: { internal: ['inventory.all', 'ui-inventory.all-permissions.TEMPORARY'], gui: 'Inventory: All permissions' },
  uiInventorySingleRecordImport: { internal: 'ui-inventory.single-record-import', gui: 'Inventory: Import single bibliographic records' },
  // Tags
  uiTagsPermissionAll: { internal: 'ui-tags.permission.all', gui:'Tags: All permissions' },
};
