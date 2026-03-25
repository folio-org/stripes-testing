import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import UrlRelationship from '../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  BULK_EDIT_FORMS,
  ITEM_STATUS_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ItemNoteTypes from '../../../../support/fragments/settings/inventory/items/itemNoteTypes';
import LoanTypes from '../../../../support/fragments/settings/inventory/items/loanTypes';
import MaterialTypes from '../../../../support/fragments/settings/inventory/items/materialTypes';
import StatisticalCodes from '../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let statisticalCodeTypeId;
const folioInstance = {
  title: `AT_C926166_FolioInstance_${getRandomPostfix()}`,
};
const localItemNoteType1 = {
  name: `AT_C926166 local itemNoteType1 ${randomFourDigitNumber()}`,
  source: 'local',
};
const localItemNoteType2 = {
  name: `AT_C926166 local itemNoteType2 ${randomFourDigitNumber()}`,
  source: 'local',
};
const localLoanType = {
  name: `AT_C926166 local loanType ${randomFourDigitNumber()}`,
  source: 'local',
};
const localMaterialType = {
  name: `AT_C926166 local materialType ${randomFourDigitNumber()}`,
  source: 'local',
};
const localStatisticalCode = {
  name: `AT_C926166 local statisticalCode ${randomFourDigitNumber()}`,
  code: `AT_C926166_localCode_${getRandomPostfix()}`,
  source: 'local',
};
const localUrlRelationship = {
  name: `AT_C926166 local urlRelationship ${randomFourDigitNumber()}`,
  source: 'local',
};
const localCallNumberType = {
  name: `AT_C926166 local callNumberType ${randomFourDigitNumber()}`,
  source: 'local',
};
const electronicAccessFields = {
  uri: 'https://www.test-uri.com/uri',
  linkText: 'Test link text',
  materialsSpecification: 'Test material specified',
  publicNote: 'Test public note',
};
const itemNoteText = 'Test item note';
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Material specified;URL public note\n';
const itemUUIDsFileName = `itemUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(itemUUIDsFileName, true);
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditItems.gui,
];

describe('Bulk-edit', () => {
  describe('Central tenant', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser(userPermissions).then((userProperties) => {
          user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: user.userId,
            permissions: userPermissions,
          });

          cy.setTenant(Affiliations.College);
          cy.getLocations({ limit: 1 }).then((res) => {
            locationId = res.id;
          });
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            sourceId = folioSource.id;
          });

          cy.resetTenant();
          // Create shared FOLIO instance
          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypeData) => {
              instanceTypeId = instanceTypeData[0].id;
            })
            .then(() => {
              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId,
                  title: folioInstance.title,
                },
              }).then((createdInstanceData) => {
                folioInstance.id = createdInstanceData.instanceId;
              });
            });

          cy.setTenant(Affiliations.College);
          // Create local reference data in College tenant
          ItemNoteTypes.createItemNoteTypeViaApi(localItemNoteType1.name).then((id) => {
            localItemNoteType1.id = id;
          });
          ItemNoteTypes.createItemNoteTypeViaApi(localItemNoteType2.name).then((id) => {
            localItemNoteType2.id = id;
          });
          LoanTypes.createLoanTypesViaApi(localLoanType).then((typeId) => {
            localLoanType.id = typeId;
          });
          MaterialTypes.createMaterialTypesViaApi({ name: localMaterialType.name }).then((id) => {
            localMaterialType.id = id;
          });
          cy.getStatisticalCodeTypes({ limit: 1, query: 'source=folio' }).then((types) => {
            statisticalCodeTypeId = types[0].id;
            localStatisticalCode.typeName = types[0].name;

            StatisticalCodes.createViaApi({
              name: localStatisticalCode.name,
              code: localStatisticalCode.code,
              statisticalCodeTypeId,
              source: 'local',
            }).then((response) => {
              localStatisticalCode.id = response.id;
              localStatisticalCode.fullName = `${localStatisticalCode.typeName}: ${localStatisticalCode.code} - ${localStatisticalCode.name}`;
            });
          });
          UrlRelationship.createViaApi(localUrlRelationship).then((response) => {
            localUrlRelationship.id = response.id;
          });
          CallNumberTypes.createCallNumberTypeViaApi(localCallNumberType)
            .then((callNumberTypeId) => {
              localCallNumberType.id = callNumberTypeId;
            })
            .then(() => {
              // Create holdings in College tenant
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: folioInstance.id,
                permanentLocationId: locationId,
                sourceId,
              }).then((holding) => {
                folioInstance.holdingId = holding.id;
              });
            })
            .then(() => {
              // Create item in College tenant with all local reference data
              folioInstance.itemBarcode = `AT_C926166_barcode_${getRandomPostfix()}`;
              InventoryItems.createItemViaApi({
                holdingsRecordId: folioInstance.holdingId,
                barcode: folioInstance.itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: localLoanType.id },
                materialType: { id: localMaterialType.id },
                statisticalCodeIds: [localStatisticalCode.id],
                itemLevelCallNumberTypeId: localCallNumberType.id,
                itemLevelCallNumber: 'Test call number',
                notes: [
                  {
                    itemNoteTypeId: localItemNoteType1.id,
                    note: itemNoteText,
                    staffOnly: false,
                  },
                ],
                electronicAccess: [
                  {
                    ...electronicAccessFields,
                    relationshipId: localUrlRelationship.id,
                  },
                ],
              }).then((item) => {
                folioInstance.itemId = item.id;
                folioInstance.itemHrid = item.hrid;

                FileManager.createFile(
                  `cypress/fixtures/${itemUUIDsFileName}`,
                  folioInstance.itemId,
                );
              });

              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            });
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.deleteItemViaApi(folioInstance.itemId);
        cy.deleteHoldingRecordViaApi(folioInstance.holdingId);
        ItemNoteTypes.deleteItemNoteTypeViaApi(localItemNoteType1.id);
        ItemNoteTypes.deleteItemNoteTypeViaApi(localItemNoteType2.id);
        LoanTypes.deleteLoanTypesViaApi(localLoanType.id);
        MaterialTypes.deleteMaterialTypesViaApi(localMaterialType.id);
        StatisticalCodes.deleteViaApi(localStatisticalCode.id);
        UrlRelationship.deleteViaApi(localUrlRelationship.id);
        CallNumberTypes.deleteLocalCallNumberTypeViaApi(localCallNumberType.id);
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(folioInstance.id);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${itemUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C926166 Verify bulk edit of Items with local reference data in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C926166'] },
        () => {
          // Step 1: Upload file and show columns with local reference data
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Items', 'Item UUIDs');
          BulkEditSearchPane.uploadFile(itemUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(folioInstance.itemHrid);
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            localItemNoteType1.name,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATISTICAL_CODES,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_LEVEL_CALL_NUMBER_TYPE,
          );

          // Initialize header values to verify across all forms
          const headerValuesToVerify = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.PERMANENT_LOAN_TYPE,
              value: localLoanType.name,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.MATERIAL_TYPE,
              value: localMaterialType.name,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.STATISTICAL_CODES,
              value: localStatisticalCode.fullName,
            },
            {
              header: localItemNoteType1.name,
              value: itemNoteText,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_LEVEL_CALL_NUMBER_TYPE,
              value: localCallNumberType.name,
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
            folioInstance.itemHrid,
            headerValuesToVerify,
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
            folioInstance.itemHrid,
            localUrlRelationship.name,
            electronicAccessFields.uri,
            electronicAccessFields.linkText,
            electronicAccessFields.materialsSpecification,
            electronicAccessFields.publicNote,
          );

          // Step 2: Download matched records and verify local reference data
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          const itemElectronicAccessFieldsInFile = `${electronicAccessTableHeadersInFile}${localUrlRelationship.name};${electronicAccessFields.uri};${electronicAccessFields.linkText};${electronicAccessFields.materialsSpecification};${electronicAccessFields.publicNote}`;

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
            folioInstance.itemHrid,
            headerValuesToVerify,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
            itemElectronicAccessFieldsInFile,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
            folioInstance.itemHrid,
          );

          // Step 3: Open bulk edit form
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 4: Perform Change note type action
          BulkEditActions.changeNoteType(localItemNoteType1.name, localItemNoteType2.name);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 5: Confirm changes and verify preview
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

          // Update header values to reflect changed note type
          const updatedHeaderValuesToVerify = headerValuesToVerify.map((item) => {
            return item.header === localItemNoteType1.name
              ? { ...item, header: localItemNoteType2.name }
              : item;
          });

          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            folioInstance.itemHrid,
            localUrlRelationship.name,
            electronicAccessFields.uri,
            electronicAccessFields.linkText,
            electronicAccessFields.materialsSpecification,
            electronicAccessFields.publicNote,
          );

          // Step 6: Verify local reference data in preview
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            folioInstance.itemHrid,
            updatedHeaderValuesToVerify,
          );

          // Step 7: Download preview and verify local reference data
          BulkEditActions.downloadPreview();

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
            folioInstance.itemHrid,
            updatedHeaderValuesToVerify,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
            itemElectronicAccessFieldsInFile,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
            folioInstance.itemHrid,
          );

          // Step 8: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);

          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
            folioInstance.itemHrid,
            localUrlRelationship.name,
            electronicAccessFields.uri,
            electronicAccessFields.linkText,
            electronicAccessFields.materialsSpecification,
            electronicAccessFields.publicNote,
          );

          // Step 9: Verify local reference data in changed records preview
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            folioInstance.itemHrid,
            updatedHeaderValuesToVerify,
          );

          // Step 10: Download changed records and verify
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
            folioInstance.itemHrid,
            updatedHeaderValuesToVerify,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ELECTRONIC_ACCESS,
            itemElectronicAccessFieldsInFile,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_ITEMS.ITEM_HRID,
            folioInstance.itemHrid,
          );

          // Step 11: Switch to member tenant and verify changes
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.searchByParameter('Barcode', folioInstance.itemBarcode);
          ItemRecordView.waitLoading();

          // Verify item note type changed to localItemNoteType2
          ItemRecordView.checkItemNote(itemNoteText, 'No', localItemNoteType2.name);

          // Verify other local reference data remained unchanged
          ItemRecordView.verifyPermanentLoanType(localLoanType.name);
          ItemRecordView.verifyMaterialType(localMaterialType.name);
          ItemRecordView.verifyCallNumber('Test call number');
          ItemRecordView.verifyStatisticalCode(localStatisticalCode.name);
          ItemRecordView.checkElectronicAccess(
            localUrlRelationship.name,
            electronicAccessFields.uri,
            electronicAccessFields.linkText,
            electronicAccessFields.materialsSpecification,
            electronicAccessFields.publicNote,
          );
        },
      );
    });
  });
});
