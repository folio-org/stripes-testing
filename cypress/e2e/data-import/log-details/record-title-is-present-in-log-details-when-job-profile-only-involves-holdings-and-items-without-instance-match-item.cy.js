import uuid from 'uuid';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    const testData = {
      instanceTitle: `C422064 autotestInstance ${getRandomPostfix()}`,
      itemBarcode: uuid(),
    };
    const exportMappingProfile = {
      name: `C422064 Testing titles for import.${getRandomPostfix()}`,
      holdingsTransformation: 'Holdings - HRID',
      holdingsMarcField: '911',
      subfieldForHoldings: '$h',
      itemTransformation: 'Item - HRID',
      itemMarcField: '911',
      subfieldForItem: '$i',
    };
    const exportJobProfileName = `C422064 Testing titles for import.${getRandomPostfix()}`;
    const marcFileNameForUpdate = `C422064 marcFile.${getRandomPostfix()}.mrc`;
    const csvFileName = `C422064 autotestFile${getRandomPostfix()}.csv`;
    const quantityOfItems = '1';
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C422064 WITHOUT instance match holdings.${getRandomPostfix()}`,
          adminNotes: 'Add this to existing',
          adminNote:
            'Purchased with grant funds for Cajun folklore materials; see item record for additional details',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C422064 WITHOUT instance match holdings.${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C422064 WITHOUT instance match item.${getRandomPostfix()}`,
          itemNote: 'Add this to existing',
          noteType: 'Provenance',
          note: 'Acquired in 2022 from the Arceneaux Trust for Cajun History',
          staffOnly: 'Unmark for all affected records',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C422064 WITHOUT instance match item.${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
    ];
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C422064 WITHOUT instance match holdings.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '911',
            subfield: 'h',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
        },
      },
      {
        matchProfile: {
          profileName: `C422064 WITHOUT instance match item.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '911',
            subfield: 'i',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.itemHrid,
        },
      },
    ];
    const jobProfileWithoutMatch = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C422064 WITHOUT instance match.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.loginAsAdmin()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
            (locations) => {
              testData.locationsId = locations.id;
            },
          );
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.instanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
              },
            ],
            items: [
              {
                barcode: testData.itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            testData.secondInstanceId = specialInstanceIds.instanceId;

            cy.getInstanceById(specialInstanceIds.instanceId).then((res) => {
              testData.secondHrid = res.hrid;
            });
          });
        });
      ExportNewFieldMappingProfile.createNewFieldMappingProfileWithTransformationsViaApi(
        exportMappingProfile.name,
      ).then((response) => {
        exportMappingProfile.fieldMappingProfileId = response.body.id;
        ExportNewJobProfile.createNewJobProfileViaApi(exportJobProfileName, response.body.id);
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportEnableSettings.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${marcFileNameForUpdate}`);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFileFromDownloadsByMask('*C422064 marcFile*', '*SearchInstanceUUIDs*');
      cy.getAdminToken().then(() => {
        ExportJobProfiles.getJobProfile({ query: `"name"=="${exportJobProfileName}"` }).then(
          (response) => {
            ExportJobProfiles.deleteJobProfileViaApi(response.id);
          },
        );
        DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(
          exportMappingProfile.fieldMappingProfileId,
        );
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileWithoutMatch.profileName);
        cy.wrap(collectionOfMatchProfiles).each((profile) => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
        });
        cy.wrap(collectionOfMappingAndActionProfiles).each((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      });
    });

    it(
      'C422064 When MARC Bib job profile only involves holdings and items, verify that the record title is present in the log details WITHOUT instance match item (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        // create mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.addAdministrativeNote(
          collectionOfMappingAndActionProfiles[0].mappingProfile.adminNote,
          5,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.addItemNotes(
          `"${collectionOfMappingAndActionProfiles[1].mappingProfile.noteType}"`,
          `"${collectionOfMappingAndActionProfiles[1].mappingProfile.note}"`,
          collectionOfMappingAndActionProfiles[1].mappingProfile.staffOnly,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        // create action profiles
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profiles
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[0].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[0].matchProfile.profileName,
        );
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[1].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[1].matchProfile.profileName,
        );

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileWithoutMatch);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[0].matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[1].matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
          2,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileWithoutMatch.profileName);

        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(testData.secondHrid);
        InstanceRecordView.verifyInstancePaneExists();
        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventorySearchAndFilter.saveUUIDs();
        // need to create a new file with instance UUID because tests are runing in multiple threads
        cy.intercept('/search/instances/ids**').as('getIds');
        cy.wait('@getIds', getLongDelay()).then((req) => {
          const expectedUUID = InventorySearchAndFilter.getUUIDsFromRequest(req);

          FileManager.createFile(`cypress/fixtures/${csvFileName}`, expectedUUID[0]);
        });

        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        ExportFile.uploadFile(csvFileName);
        ExportFile.exportWithCreatedJobProfile(csvFileName, exportJobProfileName);
        ExportFile.downloadExportedMarcFile(marcFileNameForUpdate);

        // upload the exported marc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(marcFileNameForUpdate);
        JobProfiles.search(jobProfileWithoutMatch.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileNameForUpdate);
        Logs.openFileDetails(marcFileNameForUpdate);
        FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems, 1);
        FileDetails.checkItemQuantityInSummaryTable(quantityOfItems, 1);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.DASH, columnName);
        });
        [
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.verifyTitle(testData.instanceTitle, FileDetails.columnNameInResultList.title);

        FileDetails.openHoldingsInInventory(RECORD_STATUSES.UPDATED);
        HoldingsRecordView.checkAdministrativeNote(
          collectionOfMappingAndActionProfiles[0].mappingProfile.adminNote,
        );
        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(marcFileNameForUpdate);
        FileDetails.openItemInInventory(RECORD_STATUSES.UPDATED);
        ItemRecordView.checkItemNote(
          collectionOfMappingAndActionProfiles[1].mappingProfile.note,
          'No',
          collectionOfMappingAndActionProfiles[1].mappingProfile.noteType,
        );
      },
    );
  });
});
