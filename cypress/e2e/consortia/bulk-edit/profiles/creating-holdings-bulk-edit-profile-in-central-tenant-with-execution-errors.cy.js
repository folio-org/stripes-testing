import permissions from '../../../../support/dictionary/permissions';
import BulkEditActions from '../../../../support/fragments/bulk-edit/bulk-edit-actions';
import BulkEditSearchPane, {
  getReasonForTenantNotAssociatedError,
} from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import BulkEditFiles from '../../../../support/fragments/bulk-edit/bulk-edit-files';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import UrlRelationship from '../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import HoldingsNoteTypes from '../../../../support/fragments/settings/inventory/holdings/holdingsNoteTypes';
import HoldingsBulkEditProfilesPane from '../../../../support/fragments/settings/bulk-edit/profilePane/holdingsBulkEditProfilesPane';
import HoldingsBulkEditProfileForm from '../../../../support/fragments/settings/bulk-edit/profileForm/holdingsBulkEditProfileForm';
import BulkEditPane from '../../../../support/fragments/settings/bulk-edit/bulkEditPane';
import SettingsPane from '../../../../support/fragments/settings/settingsPane';
import SelectLocationsModal from '../../../../support/fragments/bulk-edit/select-consortia-location-modal';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import {
  APPLICATION_NAMES,
  BULK_EDIT_TABLE_COLUMN_HEADERS,
  BULK_EDIT_ACTIONS,
  BULK_EDIT_FORMS,
  ELECTRONIC_ACCESS_RELATIONSHIP_NAME,
  LOCATION_NAMES,
  electronicAccessRelationshipId,
} from '../../../../support/constants';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SelectBulkEditProfileModal from '../../../../support/fragments/bulk-edit/select-bulk-edit-profile-modal';
import ExportFile from '../../../../support/fragments/data-export/exportFile';

let user;
let instanceTypeId;
let memberLocationData;
let sourceId;
let actionNoteTypeId;
let localUrlRelationshipData;
let localHoldingNoteTypeData;
let holdingId;
let holdingHrid;
const folioInstance = {
  title: `AT_C825328_FolioInstance_${getRandomPostfix()}`,
};
const localUrlRelationship = {
  name: `AT_C825328 local urlRelationship ${getRandomPostfix()}`,
};
const localHoldingNoteType = {
  name: `AT_C825328 local note type ${getRandomPostfix()}`,
};
const profileName = `AT_C825328 Holdings profile with values from central tenant ${getRandomPostfix()}`;
const noteText = 'Original shared note content';
const electronicAccessFields = {
  uri: 'https://www.testuri.com/resource',
  linkText: 'Resource link text',
  materialsSpecification: 'test material',
  publicNote: 'Resource public note',
};
const holdingUUIDsFileName = `holdingUUIdsFileName_${getRandomPostfix()}.csv`;
const fileNames = BulkEditFiles.getAllDownloadedFileNames(holdingUUIDsFileName, true);
const userPermissions = [
  permissions.bulkEditEdit.gui,
  permissions.uiInventoryViewCreateEditHoldings.gui,
  permissions.bulkEditSettingsCreate.gui,
];

describe('Bulk-edit', () => {
  describe('Profiles', () => {
    describe('Consortia', () => {
      before('create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        cy.getHoldingNoteTypeIdViaAPI('Action note').then((noteTypeId) => {
          actionNoteTypeId = noteTypeId;
        });

        // Create local URL relationship
        UrlRelationship.createViaApi({
          name: localUrlRelationship.name,
          source: 'local',
        }).then((response) => {
          localUrlRelationshipData = response;
        });

        // Create local holdings note type
        HoldingsNoteTypes.createViaApi({
          name: localHoldingNoteType.name,
          source: 'local',
        })
          .then((response) => {
            localHoldingNoteTypeData = response.body;
          })
          .then(() => {
            cy.createTempUser(userPermissions).then((userProperties) => {
              user = userProperties;

              cy.assignAffiliationToUser(Affiliations.College, user.userId);
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, userPermissions);

              cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
                instanceTypeId = instanceTypeData[0].id;
              });
              cy.getLocations({ limit: 1 }).then((res) => {
                memberLocationData = res;
              });
              InventoryHoldings.getHoldingsFolioSource()
                .then((folioSource) => {
                  sourceId = folioSource.id;
                })
                .then(() => {
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: folioInstance.title,
                    },
                  }).then((createdInstanceData) => {
                    folioInstance.id = createdInstanceData.instanceId;

                    InventoryHoldings.createHoldingRecordViaApi({
                      instanceId: folioInstance.id,
                      permanentLocationId: memberLocationData.id,
                      electronicAccess: [
                        {
                          ...electronicAccessFields,
                          relationshipId: electronicAccessRelationshipId.RESOURCE,
                        },
                      ],
                      notes: [
                        {
                          holdingsNoteTypeId: actionNoteTypeId,
                          note: noteText,
                          staffOnly: false,
                        },
                      ],
                      sourceId,
                    }).then((holding) => {
                      holdingId = holding.id;
                      holdingHrid = holding.hrid;

                      FileManager.createFile(`cypress/fixtures/${holdingUUIDsFileName}`, holdingId);
                    });
                  });
                });

              cy.resetTenant();
              cy.login(user.username, user.password, {
                path: TopMenu.settingsPath,
                waiter: SettingsPane.waitLoading,
              });
            });
          });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        HoldingsBulkEditProfilesPane.deleteBulkEditProfileByNameViaApi(profileName);
        Users.deleteViaApi(user.userId);
        UrlRelationship.deleteViaApi(localUrlRelationshipData.id);
        HoldingsNoteTypes.deleteViaApi(localHoldingNoteTypeData.id);
        cy.withinTenant(Affiliations.College, () => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
        });
        FileManager.deleteFile(`cypress/fixtures/${holdingUUIDsFileName}`);
        BulkEditFiles.deleteAllDownloadedFiles(fileNames);
      });

      // Trillium
      it.skip(
        'C825328 Create Holdings bulk edit profile in Central tenant and use it to execute bulk edit job with errors (consortia) (firebird)',
        { tags: [] },
        () => {
          // Step 1: Navigate to Holdings bulk edit profiles and create new profile
          SettingsPane.selectSettingsTab(APPLICATION_NAMES.BULK_EDIT);
          BulkEditPane.waitLoading();
          BulkEditPane.clickHoldingsBulkEditProfiles();
          HoldingsBulkEditProfilesPane.waitLoading();
          HoldingsBulkEditProfilesPane.verifyPaneElements();
          HoldingsBulkEditProfilesPane.clickNewButton();
          HoldingsBulkEditProfileForm.waitLoading();
          HoldingsBulkEditProfileForm.verifyFormElements('New holdings bulk edit profile');

          // Step 2: Verify only shared note types are displayed
          HoldingsBulkEditProfileForm.selectOption('Holdings notes');
          HoldingsBulkEditProfileForm.clickSelectOptionDropdown();
          HoldingsBulkEditProfileForm.verifyOptionExistsInSelectOptionDropdown(
            localHoldingNoteType.name,
            0,
            false,
          );

          // Step 3: Select shared note type and verify Change note type action
          HoldingsBulkEditProfileForm.selectOption(
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.ACTION_NOTE,
          );
          HoldingsBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.CHANGE_NOTE_TYPE);
          HoldingsBulkEditProfileForm.verifyNoteTypeExistsInSelectOptionDropdown(
            localHoldingNoteType.name,
            0,
            false,
          );

          // Step 4: Select shared note type option
          HoldingsBulkEditProfileForm.selectNoteTypeWhenChangingIt('Binding');
          HoldingsBulkEditProfileForm.verifySaveButtonDisabled(true);

          // Step 5: Add URL relationship row and verify only shared types are available
          HoldingsBulkEditProfileForm.clickPlusButton();
          HoldingsBulkEditProfileForm.selectOption('URL relationship', 1);
          HoldingsBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.FIND_FULL_FIELD_SEARCH, 1);
          HoldingsBulkEditProfileForm.verifyOptionExistsInSelectOptionDropdown(
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
          );
          HoldingsBulkEditProfileForm.verifyOptionExistsInSelectOptionDropdown(
            localHoldingNoteType.name,
            0,
            false,
          );

          // Step 6: Select shared URL relationship and verify Replace with action
          HoldingsBulkEditProfileForm.selectUrlRelationshipType(
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.RESOURCE,
            1,
          );
          HoldingsBulkEditProfileForm.selectAction(BULK_EDIT_ACTIONS.REPLACE_WITH, 1);
          HoldingsBulkEditProfileForm.verifyUrlRelationshipExistsInSelectOptionDropdown(
            localUrlRelationship.name,
            1,
            false,
          );

          // Step 7: Select shared URL relationship type
          HoldingsBulkEditProfileForm.selectUrlRelationshipType(
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
            1,
          );
          HoldingsBulkEditProfileForm.verifySaveButtonDisabled(true);

          // Step 8: Add permanent holdings location and verify only central tenant locations
          HoldingsBulkEditProfileForm.clickPlusButton(1);
          HoldingsBulkEditProfileForm.selectOption('Permanent holdings location', 2);
          HoldingsBulkEditProfileForm.clickLocationLookup(2);
          SelectLocationsModal.verifyTenantsInAffiliationDropdown(
            `${tenantNames.central} (Primary)`,
          );

          // Step 9: Select location from central tenant
          SelectLocationsModal.selectLocation(LOCATION_NAMES.MAIN_LIBRARY_UI);
          SelectLocationsModal.verifySelectLocationModalExists(false);
          HoldingsBulkEditProfileForm.verifySaveButtonDisabled(true);

          // Step 10: Fill profile name and save
          HoldingsBulkEditProfileForm.fillProfileName(profileName);
          HoldingsBulkEditProfileForm.verifySaveButtonDisabled(false);
          HoldingsBulkEditProfileForm.clickSaveAndClose();
          HoldingsBulkEditProfilesPane.verifySuccessToast('created');
          HoldingsBulkEditProfilesPane.waitLoading();
          HoldingsBulkEditProfilesPane.verifyProfileInTable(profileName, 'No value set-', user);

          // Step 11: Navigate to Bulk edit app and upload file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
          BulkEditSearchPane.verifyDragNDropRecordTypeIdentifierArea('Holdings', 'Holdings UUIDs');
          BulkEditSearchPane.uploadFile(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneTitleFileName(holdingUUIDsFileName);
          BulkEditSearchPane.verifyPaneRecordsCount('1 holdings');
          BulkEditSearchPane.verifyFileNameHeadLine(holdingUUIDsFileName);

          BulkEditSearchPane.verifyExactChangesUnderColumnsByIdentifierInResultsAccordion(
            holdingHrid,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            holdingHrid,
          );

          // Step 12: Select bulk edit profile
          BulkEditActions.openActions();
          BulkEditActions.clickSelectBulkEditProfile('holdings');
          SelectBulkEditProfileModal.waitLoading('holdings');
          SelectBulkEditProfileModal.selectProfile(profileName);
          BulkEditActions.verifyAreYouSureForm(1);
          BulkEditActions.verifyMessageBannerInAreYouSureForm(1);

          const editedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
              value: noteText,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              value: LOCATION_NAMES.MAIN_LIBRARY_UI,
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInAreYouSureForm(
            holdingHrid,
            editedHeaderValues,
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.ARE_YOU_SURE,
            holdingHrid,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
            electronicAccessFields.uri,
            electronicAccessFields.linkText,
            electronicAccessFields.materialsSpecification,
            electronicAccessFields.publicNote,
          );

          // Step 13: Download preview
          BulkEditActions.downloadPreview();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.previewRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            holdingHrid,
            editedHeaderValues,
          );

          // Step 14: Commit changes
          BulkEditActions.commitChanges();
          BulkEditActions.verifySuccessBanner(1);
          BulkEditSearchPane.verifyErrorLabel(1);

          const changedHeaderValues = [
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.BINDING_NOTE,
              value: noteText,
            },
            {
              header: BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_PERMANENT_LOCATION,
              value: memberLocationData.name,
            },
          ];

          BulkEditSearchPane.verifyExactChangesInMultipleColumnsByIdentifierInChangesAccordion(
            holdingHrid,
            changedHeaderValues,
          );
          BulkEditSearchPane.verifyElectronicAccessTableInForm(
            BULK_EDIT_FORMS.PREVIEW_OF_RECORDS_CHANGED,
            holdingHrid,
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
            electronicAccessFields.uri,
            electronicAccessFields.linkText,
            electronicAccessFields.materialsSpecification,
            electronicAccessFields.publicNote,
          );

          const errorMessage = getReasonForTenantNotAssociatedError(
            holdingId,
            Affiliations.College,
            'permanent location',
          );

          BulkEditSearchPane.verifyError(holdingId, errorMessage);

          // Step 15: Download changed records
          BulkEditActions.openActions();
          BulkEditActions.downloadChangedCSV();
          BulkEditFiles.verifyHeaderValueInRowByIdentifier(
            fileNames.changedRecordsCSV,
            BULK_EDIT_TABLE_COLUMN_HEADERS.INVENTORY_HOLDINGS.HOLDINGS_HRID,
            holdingHrid,
            changedHeaderValues,
          );

          // Step 16: Download errors
          BulkEditActions.downloadErrors();
          ExportFile.verifyFileIncludes(fileNames.errorsFromCommitting, [
            `ERROR,${holdingId},${errorMessage}`,
          ]);
          BulkEditFiles.verifyCSVFileRecordsNumber(fileNames.errorsFromCommitting, 1);

          // Step 17: Verify changes in member tenant Inventory
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByTitle(folioInstance.title);
          InventorySearchAndFilter.selectViewHoldings();
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkNotesByType(0, 'Binding', noteText, 'No');
          HoldingsRecordView.checkElectronicAccess(
            ELECTRONIC_ACCESS_RELATIONSHIP_NAME.VERSION_OF_RESOURCE,
            electronicAccessFields.uri,
            electronicAccessFields.linkText,
            electronicAccessFields.materialsSpecification,
            electronicAccessFields.publicNote,
          );
          HoldingsRecordView.checkPermanentLocation(memberLocationData.name);
        },
      );
    });
  });
});
