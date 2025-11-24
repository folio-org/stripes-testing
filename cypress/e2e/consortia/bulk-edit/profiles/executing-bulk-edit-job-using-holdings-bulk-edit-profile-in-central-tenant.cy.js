import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryItems from '../../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import SelectBulkEditProfileModal from '../../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import {
  APPLICATION_NAMES,
  BULK_EDIT_FORMS,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import {
  createBulkEditProfileBody,
  createAdminNoteRule,
  createSuppressFromDiscoveryRule,
  createTemporaryLocationRule,
  HoldingsRules,
  ActionCreators,
} from '../../../../support/fragments/settings/bulk-edit/bulkEditProfileFactory';

const { createElectronicAccessMaterialSpecifiedRule, createHoldingsNoteRule } = HoldingsRules;

// Profile factory functions
const createMainProfileBody = (noteTypeId) => {
  return createBulkEditProfileBody({
    name: `AT_C773233_HoldingsProfile_${getRandomPostfix()}`,
    description: 'Test holdings bulk edit profile for executing bulk edit job in central tenant',
    entityType: 'HOLDINGS_RECORD',
    ruleDetails: [
      createAdminNoteRule(ActionCreators.findAndReplace('admin', 'Administrative')),
      createSuppressFromDiscoveryRule(true, false),
      createElectronicAccessMaterialSpecifiedRule(
        ActionCreators.findAndReplace('material', 'Material'),
      ),
      createHoldingsNoteRule(
        ActionCreators.addToExisting('ADDED Electronic bookplate note'),
        noteTypeId,
      ),
      createTemporaryLocationRule(ActionCreators.clearField()),
    ],
  });
};

const createSecondProfileBody = () => {
  return createBulkEditProfileBody({
    name: `Test_HoldingsProfile_${getRandomPostfix()}`,
    description: 'Test profile for testing search and sort functionality',
    entityType: 'HOLDINGS_RECORD',
    ruleDetails: [createAdminNoteRule(ActionCreators.findAndRemove('test'))],
  });
};

const testData = {
  permissionsSet: [
    permissions.bulkEditEdit.gui,
    permissions.uiInventoryViewCreateEditHoldings.gui,
    permissions.bulkEditQueryView.gui,
  ],
  folioInstance: {
    title: `AT_C773233_FolioInstance_${getRandomPostfix()}`,
    holdingIds: [],
    itemIds: [],
    itemBarcode: `Item_College_${getRandomPostfix()}`,
  },
  profileIds: [],
  administrativeNote: 'admin note for testing',
  editedAdministrativeNote: 'Administrative note for testing',
  materialsSpecified: 'materials specified text',
  editedMaterialsSpecified: 'Materials specified text',
  electronicBookplateNote: 'ADDED Electronic bookplate note',
  uri: 'https://example.com',
  linkText: 'Link text for testing',
  electronicAccessTableHeadersInFile:
    'URL relationship;URI;Link text;Material specified;URL public note\n',
};

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.createTempUser(testData.permissionsSet).then((userProperties) => {
          testData.user = userProperties;

          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, testData.permissionsSet);
          cy.resetTenant();
          cy.getAdminUserDetails().then((record) => {
            testData.adminSourceRecord = record;
          });
          cy.getHoldingNoteTypeIdViaAPI('Electronic bookplate').then((noteTypeId) => {
            // Create profiles with note type ID
            cy.createBulkEditProfile(createMainProfileBody(noteTypeId)).then((profile) => {
              testData.profileName = profile.name;
              testData.profileDescription = profile.description;
              testData.profileIds.push(profile.id);
            });

            cy.createBulkEditProfile(createSecondProfileBody()).then((profile) => {
              testData.secondProfileName = profile.name;
              testData.profileIds.push(profile.id);
            });
          });
          cy.getInstanceTypes({ limit: 1 })
            .then((instanceTypeData) => {
              testData.instanceTypeId = instanceTypeData[0].id;

              InventoryInstances.createFolioInstanceViaApi({
                instance: {
                  instanceTypeId: testData.instanceTypeId,
                  title: testData.folioInstance.title,
                },
              }).then((createdInstanceData) => {
                testData.folioInstance.uuid = createdInstanceData.instanceId;
              });
            })
            .then(() => {
              cy.setTenant(Affiliations.College);
              cy.getLocations({ limit: 1 }).then((res) => {
                testData.locationId = res.id;
                testData.locationName = res.name;
              });
              cy.getMaterialTypes({ limit: 1 }).then((res) => {
                testData.materialTypeId = res.id;
              });
              cy.getLoanTypes({ query: `name="${LOAN_TYPE_NAMES.CAN_CIRCULATE}"` }).then((res) => {
                testData.loanTypeId = res[0].id;
              });
              InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
                testData.sourceId = folioSource.id;
              });
            })
            .then(() => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: testData.folioInstance.uuid,
                permanentLocationId: testData.locationId,
                temporaryLocationId: testData.locationId,
                sourceId: testData.sourceId,
                administrativeNotes: [testData.administrativeNote],
                discoverySuppress: true,
                electronicAccess: [
                  {
                    uri: testData.uri,
                    linkText: testData.linkText,
                    materialsSpecification: testData.materialsSpecified,
                  },
                ],
              }).then((holding) => {
                testData.folioInstance.holdingIds.push(holding.id);
                testData.holdingHrid = holding.hrid;
                cy.wait(1000);

                InventoryItems.createItemViaApi({
                  barcode: testData.folioInstance.itemBarcode,
                  holdingsRecordId: holding.id,
                  materialType: { id: testData.materialTypeId },
                  permanentLoanType: { id: testData.loanTypeId },
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  discoverySuppress: true,
                }).then((item) => {
                  testData.folioInstance.itemIds.push(item.id);
                });
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.bulkEditPath,
                waiter: BulkEditSearchPane.waitLoading,
              });
              BulkEditSearchPane.openQuerySearch();
              BulkEditSearchPane.checkHoldingsRadio();
              BulkEditSearchPane.clickBuildQueryButton();
              QueryModal.verify();
              QueryModal.selectField(holdingsFieldValues.temporaryLocation);
              QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
              QueryModal.chooseValueSelect(testData.locationName);
              QueryModal.addNewRow();
              QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
              QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL, 1);
              QueryModal.fillInValueTextfield(testData.folioInstance.uuid, 1);
              cy.intercept('GET', '**/preview?limit=100&offset=0&step=UPLOAD*').as('getPreview');
              QueryModal.clickTestQuery();
              QueryModal.verifyPreviewOfRecordsMatched();
              QueryModal.clickRunQuery();
              QueryModal.verifyClosed();
              cy.wait('@getPreview', getLongDelay()).then((interception) => {
                const interceptedUuid = interception.request.url.match(
                  /bulk-operations\/([a-f0-9-]+)\/preview/,
                )[1];
                testData.queryFileNames = BulkEditFiles.getAllQueryDownloadedFileNames(
                  interceptedUuid,
                  true,
                );
              });
            });
        });
      });

      after('delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);

        testData.profileIds.forEach((id) => cy.deleteBulkEditProfile(id, true));

        cy.setTenant(Affiliations.College);
        cy.deleteItemViaApi(testData.folioInstance.itemIds[0]);
        cy.deleteHoldingRecordViaApi(testData.folioInstance.holdingIds[0]);

        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(testData.folioInstance.uuid);
        BulkEditFiles.deleteAllDownloadedFiles(testData.queryFileNames);
      });

      // Trillium
      it.skip(
        'C773233 ECS | Executing bulk edit job using Holdings bulk edit profile in Central tenant (Query) (consortia) (firebird)',
        { tags: [] },
        () => {
          // Step 1: Click "Actions" menu
          BulkEditSearchPane.verifyActionsAfterConductedInAppUploading(false);

          // Step 2: In the list of available column names uncheck checkboxes next to the options
          // that are going to be edited based on the bulk edit profile
          BulkEditSearchPane.uncheckShowColumnCheckbox(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
          );

          // Step 3: Click "Select holdings bulk edit profile"
          BulkEditActions.clickSelectBulkEditProfile('holdings');
          SelectBulkEditProfileModal.waitLoading('holdings');
          SelectBulkEditProfileModal.verifyAllModalElements();

          // Step 4-5: Verify the table with the list of existing holdings bulk edit profiles
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfilesFoundText();
          SelectBulkEditProfileModal.verifyProfileNumberMatchesNumberInSettings('holdings');
          SelectBulkEditProfileModal.verifyProfilesSortedByName();
          SelectBulkEditProfileModal.changeSortOrderByName();
          SelectBulkEditProfileModal.verifyProfilesSortedByName('descending');
          SelectBulkEditProfileModal.changeSortOrderByUpdatedDate();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedDate();
          SelectBulkEditProfileModal.changeSortOrderByUpdatedBy();
          SelectBulkEditProfileModal.verifyProfilesSortedByUpdatedBy();
          SelectBulkEditProfileModal.searchProfile('at_C773233');
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);
          SelectBulkEditProfileModal.searchProfile(testData.profileName);
          SelectBulkEditProfileModal.verifyProfileInTable(
            testData.profileName,
            testData.profileDescription,
            testData.adminSourceRecord,
          );
          SelectBulkEditProfileModal.verifyProfileAbsentInTable(testData.secondProfileName);

          // Step 6: Click on the row with holdings bulk edit profile from Preconditions
          SelectBulkEditProfileModal.selectProfile(testData.profileName);
          SelectBulkEditProfileModal.verifyModalClosed('holdings');
          BulkEditActions.verifyAreYouSureForm(1);

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ADMINISTRATIVE_NOTE,
              value: testData.editedAdministrativeNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_BOOKPLATE_NOTE,
              value: testData.electronicBookplateNote,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_TEMPORARY_LOCATION,
              value: '',
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            testData.holdingHrid,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifier(
            testData.holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            'false',
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            testData.holdingHrid,
            '-',
            testData.uri,
            testData.linkText,
            testData.editedMaterialsSpecified,
            '-',
          );
          BulkEditSearchPane.verifyPaginatorInAreYouSureForm(1);

          // Step 7: Click the "Download preview in CSV format" button
          BulkEditActions.downloadPreview();

          const electronicAccessInFile = `${testData.electronicAccessTableHeadersInFile}-;${testData.uri};${testData.linkText};${testData.editedMaterialsSpecified};-`;

          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            testData.queryFileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            testData.holdingHrid,
            editedHeaderValues,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            testData.queryFileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            testData.holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            false,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            testData.queryFileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            testData.holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            electronicAccessInFile,
          );

          // Step 8: Click "Commit changes" button
          BulkEditActions.commitChanges();
          BulkEditSearchPane.waitFileUploading();
          BulkEditActions.verifySuccessBanner(1);

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            testData.holdingHrid,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInChangesAccordion(
            testData.holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            'false',
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
            testData.holdingHrid,
            '-',
            testData.uri,
            testData.linkText,
            testData.editedMaterialsSpecified,
            '-',
          );

          // Step 9: Click the "Actions" menu and Select "Download changed records (CSV)" element
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            testData.queryFileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            testData.holdingHrid,
            editedHeaderValues,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            testData.queryFileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            testData.holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.SUPPRESS_FROM_DISCOVERY,
            false,
          );
          BulkEditFiles.verifyValueInRowByUUID(
            testData.queryFileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            testData.holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ELECTRONIC_ACCESS,
            electronicAccessInFile,
          );

          // Step 10: Switch affiliation to member tenant, Navigate to "Inventory" app
          // Search for the recently edited Holdings, Verify that made changes have been applied
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.switchToHoldings();
          InventorySearchAndFilter.searchHoldingsByHRID(testData.holdingHrid);
          InventorySearchAndFilter.selectViewHoldings();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkAdministrativeNote(testData.editedAdministrativeNote);
          HoldingsRecordView.checkMarkAsSuppressedFromDiscoveryAbsent();
          HoldingsRecordView.checkElectronicAccess(
            '-',
            testData.uri,
            testData.linkText,
            testData.editedMaterialsSpecified,
            '-',
          );
          HoldingsRecordView.checkNotesByType(
            0,
            'Electronic bookplate',
            testData.electronicBookplateNote,
            'No',
          );
          HoldingsRecordView.checkTemporaryLocation('No value set-');
          HoldingsRecordView.close();
          InventoryInstance.openHoldingsAccordion(testData.locationName);
          InventoryInstance.openItemByBarcode(testData.folioInstance.itemBarcode);
          cy.wait(1000);
          ItemRecordView.suppressedAsDiscoveryIsPresent();
        },
      );
    });
  });
});
