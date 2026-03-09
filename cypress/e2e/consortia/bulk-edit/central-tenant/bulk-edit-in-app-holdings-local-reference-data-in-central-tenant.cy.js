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
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import UrlRelationship from '../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  BULK_EDIT_FORMS,
  BULK_EDIT_ACTIONS,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import HoldingsNoteTypes from '../../../../support/fragments/settings/inventory/holdings/holdingsNoteTypes';
import HoldingsTypes from '../../../../support/fragments/settings/inventory/holdings/holdingsTypes';
import StatisticalCodes from '../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import { CallNumberTypes } from '../../../../support/fragments/settings/inventory/instances/callNumberTypes';

let user;
let instanceTypeId;
let locationId;
let sourceId;
let statisticalCodeTypeId;
let illPolicyId;
const folioInstance = {
  title: `AT_C926165_FolioInstance_${getRandomPostfix()}`,
};
const localHoldingNoteType = {
  name: `AT_C926165 local holdingNoteType ${randomFourDigitNumber()}`,
  source: 'local',
};
const localHoldingsType = {
  name: `AT_C926165 local holdingsType ${randomFourDigitNumber()}`,
  source: 'local',
};
const localStatisticalCode = {
  name: `AT_C926165 local statisticalCode ${randomFourDigitNumber()}`,
  code: `AT_C926165_localCode_${getRandomPostfix()}`,
  source: 'local',
};
const localUrlRelationship1 = {
  name: `AT_C926165 local urlRelationship1 ${randomFourDigitNumber()}`,
  source: 'local',
};
const localUrlRelationship2 = {
  name: `AT_C926165 local urlRelationship2 ${randomFourDigitNumber()}`,
  source: 'local',
};
const localCallNumberType = {
  name: `AT_C926165 local callNumberType ${randomFourDigitNumber()}`,
  source: 'local',
};
const localIllPolicy = {
  name: `AT_C926165_ILL_Policy_${randomFourDigitNumber()}`,
  source: 'local',
};
const electronicAccessFields = {
  uri: 'https://www.test-uri.com/uri',
  linkText: 'Test link text',
  materialsSpecification: 'Test material specified',
  publicNote: 'Test public note',
};
const holdingNoteText = 'Test holding note';
const electronicAccessTableHeadersInFile =
  'URL relationship;URI;Link text;Material specified;URL public note\n';
const holdingUUIDsFileName = `holdingUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditHoldings.gui,
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
          HoldingsNoteTypes.createViaApi(localHoldingNoteType).then((response) => {
            localHoldingNoteType.id = response.body.id;
          });
          HoldingsTypes.createViaApi(localHoldingsType).then((response) => {
            localHoldingsType.id = response.body.id;
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
          UrlRelationship.createViaApi(localUrlRelationship1).then((response) => {
            localUrlRelationship1.id = response.id;
          });
          UrlRelationship.createViaApi(localUrlRelationship2)
            .then((response) => {
              localUrlRelationship2.id = response.id;
            })
            .then((response) => {
              localUrlRelationship2.id = response.id;
            });
          CallNumberTypes.createCallNumberTypeViaApi(localCallNumberType).then(
            (callNumberTypeId) => {
              localCallNumberType.id = callNumberTypeId;
            },
          );
          cy.createIllPolicy(localIllPolicy.name)
            .then((illPolicy) => {
              illPolicyId = illPolicy.id;
            })
            .then(() => {
              // Create holdings in College tenant with all local reference data
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: folioInstance.id,
                permanentLocationId: locationId,
                holdingsTypeId: localHoldingsType.id,
                illPolicyId,
                statisticalCodeIds: [localStatisticalCode.id],
                electronicAccess: [
                  {
                    ...electronicAccessFields,
                    relationshipId: localUrlRelationship1.id,
                  },
                ],
                callNumberTypeId: localCallNumberType.id,
                callNumber: 'Test call number',
                notes: [
                  {
                    holdingsNoteTypeId: localHoldingNoteType.id,
                    note: holdingNoteText,
                    staffOnly: false,
                  },
                ],
                sourceId,
              }).then((holding) => {
                folioInstance.holdingId = holding.id;
                folioInstance.holdingHrid = holding.hrid;

                FileManager.createFile(
                  `cypress/fixtures/${holdingUUIDsFileName}`,
                  folioInstance.holdingId,
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
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.deleteHoldingRecordViaApi(folioInstance.holdingId);
        HoldingsNoteTypes.deleteViaApi(localHoldingNoteType.id);
        HoldingsTypes.deleteViaApi(localHoldingsType.id);
        StatisticalCodes.deleteViaApi(localStatisticalCode.id);
        UrlRelationship.deleteViaApi(localUrlRelationship1.id);
        UrlRelationship.deleteViaApi(localUrlRelationship2.id);
        CallNumberTypes.deleteLocalCallNumberTypeViaApi(localCallNumberType.id);
        cy.deleteIllPolicy(illPolicyId);
        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(folioInstance.id);
        Users.deleteViaApi(user.userId);
        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      it(
        'C926165 Verify bulk edit of Holdings with local reference data in Central tenant (consortia) (firebird)',
        { tags: ['criticalPathECS', 'firebird', 'C926165'] },
        () => {
          // Step 1: Upload file and show columns with local reference data
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.waitFileUploading();
          BulkEditSearchPane.verifyMatchedResults(folioInstance.holdingHrid);
          BulkEditActions.openActions();
          BulkEditSearchPane.changeShowColumnCheckboxIfNotYet(
            localHoldingNoteType.name,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TYPE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ILL_POLICY,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.STATISTICAL_CODES,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_LEVEL_CALL_NUMBER_TYPE,
          );

          // Initialize header values to verify across all forms
          const headerValuesToVerify = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TYPE,
              value: localHoldingsType.name,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.STATISTICAL_CODES,
              value: localStatisticalCode.fullName,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ILL_POLICY,
              value: localIllPolicy.name,
            },
            {
              header: localHoldingNoteType.name,
              value: holdingNoteText,
            },
            {
              header:
                BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_LEVEL_CALL_NUMBER_TYPE,
              value: localCallNumberType.name,
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInResultsAccordion(
            folioInstance.holdingHrid,
            headerValuesToVerify,
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_MATCHED,
            folioInstance.holdingHrid,
            localUrlRelationship1.name,
            electronicAccessFields.uri,
            electronicAccessFields.linkText,
            electronicAccessFields.materialsSpecification,
            electronicAccessFields.publicNote,
          );

          // Step 2: Download matched records and verify local reference data
          BulkEditActions.openActions();
          BulkEditActions.downloadMatchedResults();

          const holdingElectronicAccessFieldsInFile = `${electronicAccessTableHeadersInFile}${localUrlRelationship1.name};${electronicAccessFields.uri};${electronicAccessFields.linkText};${electronicAccessFields.materialsSpecification};${electronicAccessFields.publicNote}`;

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            folioInstance.holdingHrid,
            headerValuesToVerify,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.matchedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            holdingElectronicAccessFieldsInFile,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            folioInstance.holdingHrid,
          );

          // Step 3: Open bulk edit form
          BulkEditActions.openStartBulkEditForm();
          BulkEditActions.verifyBulkEditsAccordionExists();
          BulkEditActions.verifyOptionsDropdown();
          BulkEditActions.verifyRowIcons();
          BulkEditActions.verifyCancelButtonDisabled(false);
          BulkEditActions.verifyConfirmButtonDisabled(true);

          // Step 4: Perform Find & Replace on URL Relationship (local types)
          BulkEditActions.selectOption('URL relationship');
          BulkEditActions.selectAction(BULK_EDIT_ACTIONS.FIND_FULL_FIELD_SEARCH);
          BulkEditActions.checkTypeExists(localUrlRelationship1.name);
          BulkEditActions.selectFromUnchangedSelect(localUrlRelationship1.name);
          BulkEditActions.selectSecondAction(BULK_EDIT_ACTIONS.REPLACE_WITH);
          BulkEditActions.checkTypeExists(localUrlRelationship2.name);
          BulkEditActions.selectFromUnchangedSelect(localUrlRelationship2.name);
          BulkEditActions.verifyConfirmButtonDisabled(false);

          // Step 5: Confirm changes and verify preview
          BulkEditActions.confirmChanges();
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            folioInstance.holdingHrid,
            localUrlRelationship2.name,
            electronicAccessFields.uri,
            electronicAccessFields.linkText,
            electronicAccessFields.materialsSpecification,
            electronicAccessFields.publicNote,
          );

          // Step 6: Verify local reference data in preview
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            folioInstance.holdingHrid,
            headerValuesToVerify,
          );

          // Step 7: Download preview and verify local reference data
          BulkEditActions.downloadPreview();

          const editedHoldingElectronicAccessFieldsInFile = `${electronicAccessTableHeadersInFile}${localUrlRelationship2.name};${electronicAccessFields.uri};${electronicAccessFields.linkText};${electronicAccessFields.materialsSpecification};${electronicAccessFields.publicNote}`;

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            folioInstance.holdingHrid,
            headerValuesToVerify,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            editedHoldingElectronicAccessFieldsInFile,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            folioInstance.holdingHrid,
          );

          // Step 8: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);

          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
            folioInstance.holdingHrid,
            localUrlRelationship2.name,
            electronicAccessFields.uri,
            electronicAccessFields.linkText,
            electronicAccessFields.materialsSpecification,
            electronicAccessFields.publicNote,
          );

          // Step 9: Verify local reference data in changed records preview
          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            folioInstance.holdingHrid,
            headerValuesToVerify,
          );

          // Step 10: Download changed records and verify
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            folioInstance.holdingHrid,
            headerValuesToVerify,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            editedHoldingElectronicAccessFieldsInFile,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            folioInstance.holdingHrid,
          );

          // Step 11: Switch to member tenant and verify changes
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
          InventorySearchAndFilter.selectViewHoldings();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkElectronicAccess(
            localUrlRelationship2.name,
            electronicAccessFields.uri,
            electronicAccessFields.linkText,
            electronicAccessFields.materialsSpecification,
            electronicAccessFields.publicNote,
          );

          // Verify other local reference data remained unchanged
          HoldingsRecordView.checkNotesByType(0, localHoldingNoteType.name, holdingNoteText, 'No');
          HoldingsRecordView.checkHoldingsType(localHoldingsType.name);
          HoldingsRecordView.checkStatisticalCode(localStatisticalCode.name);
          HoldingsRecordView.checkStatisticalCode(localStatisticalCode.typeName);
          HoldingsRecordView.checkCallNumberType(localCallNumberType.name);
          HoldingsRecordView.checkIllPolicy(localIllPolicy.name);
        },
      );
    });
  });
});
