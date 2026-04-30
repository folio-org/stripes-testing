import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  EXISTING_RECORD_NAMES,
  EXPORT_TRANSFORMATION_NAMES,
  FOLIO_RECORD_TYPE,
  HOLDINGS_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import {
  ActionProfiles as SettingsActionProfiles,
  SettingsDataImport,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfileView from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import { SETTINGS_TABS } from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import noteTypes from '../../../../support/fragments/settings/notes/noteTypes';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Data Import', () => {
  describe('End to end scenarios', () => {
    const testData = {
      mappingProfileIds: [],
      actionProfileIds: [],
      // file names
      nameMarcFileForImportCreate: `C343335 autotestFile${getRandomPostfix()}.mrc`,
      nameForCSVFile: `autotestFile${getRandomPostfix()}.csv`,
      nameMarcFileForImportUpdate: `C343335 autotestFile${getRandomPostfix()}.mrc`,
      jobProfileNameForExport: `autoTestJobProf.${getRandomPostfix()}`,
      // profiles for creating
      marcBibMappingProfileForCreate: {
        name: `C343335 create marcBib mapping profile ${getRandomPostfix()}`,
        updatingText: `Test update ${getRandomPostfix()}`,
        subfield: 'a',
        fieldNumber: '650',
        indicator2: '4',
      },
      instanceMappingProfileForCreate: {
        name: `C343335 create instance mapping profile ${getRandomPostfix()}`,
      },
      holdingsMappingProfileForCreate: {
        name: `C343335 create holdings mapping profile ${getRandomPostfix()}`,
        permanentLocation: '',
      },
      itemMappingProfileForCreate: {
        name: `C343335 create item mapping profile ${getRandomPostfix()}`,
        materialType: '',
        permanentLoanType: '',
        status: ITEM_STATUS_NAMES.AVAILABLE,
      },
      actionProfilesForCreate: [
        {
          actionProfile: {
            name: `C343335 create marcBib action profile ${getRandomPostfix()}`,
            action: 'MODIFY',
            folioRecordType: 'MARC_BIBLIOGRAPHIC',
          },
        },
        {
          actionProfile: {
            name: `C343335 create instance action profile ${getRandomPostfix()}`,
            action: 'CREATE',
            folioRecordType: 'INSTANCE',
          },
        },
        {
          actionProfile: {
            name: `C343335 create holdings action profile ${getRandomPostfix()}`,
            action: 'CREATE',
            folioRecordType: 'HOLDINGS',
          },
        },
        {
          actionProfile: {
            name: `C343335 create item action profile ${getRandomPostfix()}`,
            action: 'CREATE',
            folioRecordType: 'ITEM',
          },
        },
      ],
      jobProfileForCreate: {
        name: `C343335 create job profile ${getRandomPostfix()}`,
      },
      // profiles for updating
      collectionOfMappingAndActionProfiles: [
        {
          mappingProfile: {
            typeValue: FOLIO_RECORD_TYPE.INSTANCE,
            name: `C343335 autotestMappingInstance${getRandomPostfix()}`,
          },
          actionProfile: {
            typeValue: FOLIO_RECORD_TYPE.INSTANCE,
            name: `C343335 autotestActionInstance${getRandomPostfix()}`,
            action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
          },
        },
        {
          mappingProfile: {
            typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
            name: `C343335 autotestMappingHoldings${getRandomPostfix()}`,
            callNumberType: `"${CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS}"`,
          },
          actionProfile: {
            typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
            name: `C343335 autotestActionHoldings${getRandomPostfix()}`,
            action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
          },
        },
        {
          mappingProfile: {
            typeValue: FOLIO_RECORD_TYPE.ITEM,
            name: `C343335 autotestMappingItem${getRandomPostfix()}`,
            status: ITEM_STATUS_NAMES.AVAILABLE,
          },
          actionProfile: {
            typeValue: FOLIO_RECORD_TYPE.ITEM,
            name: `C343335 autotestActionItem${getRandomPostfix()}`,
            action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
          },
        },
      ],
      collectionOfMatchProfiles: [
        {
          matchProfile: {
            profileName: `C343335 autotestMatchInstance${getRandomPostfix()}`,
            incomingRecordFields: {
              field: '001',
            },
            existingRecordFields: {
              field: '001',
            },
            matchCriterion: 'Exactly matches',
            existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          },
        },
        {
          matchProfile: {
            profileName: `C343335 autotestMatchHoldings${getRandomPostfix()}`,
            incomingRecordFields: {
              field: '901',
              subfield: 'a',
            },
            matchCriterion: 'Exactly matches',
            existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
            holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
          },
        },
        {
          matchProfile: {
            profileName: `C343335 autotestMatchItem${getRandomPostfix()}`,
            incomingRecordFields: {
              field: '902',
              subfield: 'a',
            },
            matchCriterion: 'Exactly matches',
            existingRecordType: EXISTING_RECORD_NAMES.ITEM,
            itemOption: NewMatchProfile.optionsList.itemHrid,
          },
        },
      ],
      jobProfileForUpdate: {
        ...NewJobProfile.defaultJobProfile,
        profileName: `C343335 autotestJobProf${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      },
      // field mapping profile for export
      exportMappingProfile: {
        name: `C343335 autoTestMappingProf.${getRandomPostfix()}`,
        holdingsTransformation: EXPORT_TRANSFORMATION_NAMES.HOLDINGS_HRID,
        holdingsMarcField: '901',
        subfieldForHoldings: 'a',
        itemTransformation: EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
        itemMarcField: '902',
        subfieldForItem: 'a',
      },
    };

    before('Create test data and login', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password);
      NewFieldMappingProfile.createModifyMarcBibMappingProfileViaApi(
        testData.marcBibMappingProfileForCreate,
      ).then((mappingProfileResponse) => {
        testData.mappingProfileIds.push(mappingProfileResponse.body.id);

        NewActionProfile.createActionProfileViaApi(
          testData.actionProfilesForCreate[0].actionProfile,
          mappingProfileResponse.body.id,
        ).then((actionProfileResponse) => {
          testData.actionProfileIds.push(actionProfileResponse.body.id);
        });
      });
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(
        testData.instanceMappingProfileForCreate,
      ).then((mappingProfileResponse) => {
        testData.mappingProfileIds.push(mappingProfileResponse.body.id);

        NewActionProfile.createActionProfileViaApi(
          testData.actionProfilesForCreate[1].actionProfile,
          mappingProfileResponse.body.id,
        ).then((actionProfileResponse) => {
          testData.actionProfileIds.push(actionProfileResponse.body.id);
        });
      });
      cy.getLocations({ limit: 2 }).then((locationResp) => {
        testData.location = locationResp;
        testData.locationForUpdate = Cypress.env('locations')[1];
        testData.holdingsMappingProfileForCreate.permanentLocation = `${locationResp.name} (${locationResp.code})`;

        NewFieldMappingProfile.createHoldingsMappingProfileViaApi(
          testData.holdingsMappingProfileForCreate,
        ).then((mappingProfileResponse) => {
          testData.mappingProfileIds.push(mappingProfileResponse.body.id);

          NewActionProfile.createActionProfileViaApi(
            testData.actionProfilesForCreate[2].actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            testData.actionProfileIds.push(actionProfileResponse.body.id);
          });
        });
      });
      cy.getMaterialTypes({ limit: 2 }).then((materialTypeResponse) => {
        testData.materialType = materialTypeResponse;
        testData.materialTypeForUpdate = Cypress.env('materialTypes')[1];
        testData.itemMappingProfileForCreate.materialType = materialTypeResponse.name;

        cy.getLoanTypes({ limit: 2 }).then((loanTypeResponse) => {
          testData.loanType = loanTypeResponse[0];
          testData.loanTypeForUpdate = loanTypeResponse[1];
          testData.itemMappingProfileForCreate.permanentLoanType = loanTypeResponse[0].name;

          NewFieldMappingProfile.createItemMappingProfileViaApi(
            testData.itemMappingProfileForCreate,
          )
            .then((mappingProfileResponse) => {
              testData.mappingProfileIds.push(mappingProfileResponse.body.id);

              NewActionProfile.createActionProfileViaApi(
                testData.actionProfilesForCreate[3].actionProfile,
                mappingProfileResponse.body.id,
              ).then((actionProfileResponse) => {
                testData.actionProfileIds.push(actionProfileResponse.body.id);
              });
            })
            .then(() => {
              NewJobProfile.createJobProfileWithLinkedFourActionProfilesViaApi(
                testData.jobProfileForCreate,
                testData.actionProfileIds[0],
                testData.actionProfileIds[1],
                testData.actionProfileIds[2],
                testData.actionProfileIds[3],
              );
            });
        });
        noteTypes.getNoteTypesViaApi().then((noteTypesResp) => {
          console.log('noteTypesResponse', noteTypesResp);
          testData.noteType = noteTypesResp.name;
        });
      });

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${testData.nameMarcFileForImportUpdate}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.nameForCSVFile}`);
      FileManager.deleteFileFromDownloadsByMask('*SearchInstanceUUIDs*');
      FileManager.deleteFileFromDownloadsByMask(`*${testData.nameMarcFileForImportUpdate}`);
      FileManager.deleteFileFromDownloadsByMask(`*${testData.nameForCSVFile}`);
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password, { log: false }).then(() => {
        // delete generated profiles
        SettingsJobProfiles.deleteJobProfileByNameViaApi(testData.jobProfileForUpdate.profileName);
        testData.collectionOfMatchProfiles.forEach((profile) => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
        });
        testData.collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        SettingsJobProfiles.deleteJobProfileByNameViaApi(testData.jobProfileForCreate.name);
        testData.actionProfileIds.forEach((id) => {
          SettingsActionProfiles.deleteActionProfileViaApi(id);
        });
        testData.mappingProfileIds.forEach((id) => {
          SettingsFieldMappingProfiles.deleteMappingProfileViaApi(id);
        });
        cy.getInstance({
          limit: 1,
          expandAll: true,
          query: `"hrid"=="${testData.instanceHRID}"`,
        }).then((instance) => {
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });
    });

    const createInstanceMappingProfile = (profile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
      NewFieldMappingProfile.fillCatalogedDate('###TODAY###');
      NewFieldMappingProfile.fillInstanceStatusTerm();
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    };

    const createHoldingsMappingProfile = (profile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
      NewFieldMappingProfile.fillHoldingsType(HOLDINGS_TYPE_NAMES.ELECTRONIC);
      NewFieldMappingProfile.fillPermanentLocation(
        `"${testData.locationForUpdate.name} (${testData.locationForUpdate.code})"`,
      );
      NewFieldMappingProfile.fillCallNumberType(profile.callNumberType);
      NewFieldMappingProfile.fillCallNumber('050$a " " 050$b');
      NewFieldMappingProfile.addElectronicAccess(profile.typeValue, '"Resource"', '856$u');
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    };

    const createItemMappingProfile = (profile) => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(profile);
      NewFieldMappingProfile.fillMaterialType(`"${testData.materialTypeForUpdate.name}"`);
      NewFieldMappingProfile.addItemNotes(
        `"${testData.noteType}"`,
        '"Smith Family Foundation"',
        'Mark for all affected records',
      );
      NewFieldMappingProfile.fillPermanentLoanType(testData.loanTypeForUpdate.name);
      NewFieldMappingProfile.fillStatus(`"${profile.status}"`);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(profile.name);
    };

    it(
      'C343335 MARC file upload with the update of instance, holding, and items (folijet)',
      { tags: ['dryRun', 'folijet', 'C343335'] },
      () => {
        cy.getUserToken(user.username, user.password);
        DataImport.verifyUploadState();
        // upload a marc file for creating of the new instance, holding and item
        DataImport.uploadFile('oneMarcBib.mrc', testData.nameMarcFileForImportCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(testData.jobProfileForCreate.name);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.nameMarcFileForImportCreate);
        Logs.checkJobStatus(testData.nameMarcFileForImportCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.nameMarcFileForImportCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.checkItemsQuantityInSummaryTable(0, '1');
        FileDetails.checkItemsQuantityInSummaryTable(1, '0');

        // open Instance for getting hrid
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          testData.instanceHRID = initialInstanceHrId;

          // download .csv file
          TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
          cy.intercept('/inventory/instances/*').as('getId');
          InventorySearchAndFilter.searchInstanceByHRID(testData.instanceHRID);
          cy.wait('@getId', getLongDelay()).then((req) => {
            InventorySearchAndFilter.saveUUIDs();
            // need to create a new file with instance UUID because tests are runing in multiple threads
            const expectedUUID = InventorySearchAndFilter.getInstanceUUIDFromRequest(req);

            FileManager.createFile(`cypress/fixtures/${testData.nameForCSVFile}`, expectedUUID);
          });
        });

        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.SETTINGS);
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        ExportFieldMappingProfiles.createMappingProfile(testData.exportMappingProfile);
        ExportFieldMappingProfiles.verifyProfileNameOnTheList(testData.exportMappingProfile.name);

        ExportJobProfiles.goToJobProfilesTab();
        cy.wait(1500);
        ExportJobProfiles.createJobProfile(
          testData.jobProfileNameForExport,
          testData.exportMappingProfile.name,
        );
        ExportJobProfiles.verifyJobProfileInTheTable(testData.jobProfileNameForExport);

        // download exported marc file
        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.DATA_EXPORT);
        ExportFile.uploadFile(testData.nameForCSVFile);
        ExportFile.exportWithCreatedJobProfile(
          testData.nameForCSVFile,
          testData.jobProfileNameForExport,
        );
        ExportFile.downloadExportedMarcFile(testData.nameMarcFileForImportUpdate);

        // create mapping and action profiles
        TopMenuNavigation.openAppFromDropdown(
          APPLICATION_NAMES.SETTINGS,
          APPLICATION_NAMES.DATA_IMPORT,
        );
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        createInstanceMappingProfile(
          testData.collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          testData.collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        createHoldingsMappingProfile(
          testData.collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          testData.collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        createItemMappingProfile(testData.collectionOfMappingAndActionProfiles[2].mappingProfile);
        FieldMappingProfiles.checkMappingProfilePresented(
          testData.collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );

        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        testData.collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create Match profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        testData.collectionOfMatchProfiles.forEach((profile) => {
          MatchProfiles.createMatchProfile(profile.matchProfile);
          MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
          cy.wait(3000);
        });

        // create Job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfileWithLinkingProfilesForUpdate(testData.jobProfileForUpdate);
        NewJobProfile.linkMatchAndActionProfiles(
          testData.collectionOfMatchProfiles[0].matchProfile.profileName,
          testData.collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );
        NewJobProfile.linkMatchAndActionProfiles(
          testData.collectionOfMatchProfiles[1].matchProfile.profileName,
          testData.collectionOfMappingAndActionProfiles[1].actionProfile.name,
          2,
        );
        NewJobProfile.linkMatchAndActionProfiles(
          testData.collectionOfMatchProfiles[2].matchProfile.profileName,
          testData.collectionOfMappingAndActionProfiles[2].actionProfile.name,
          4,
        );
        NewJobProfile.saveAndClose();

        // upload the exported marc file
        TopMenuNavigation.navigateToAppAdaptive(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(testData.nameMarcFileForImportUpdate);
        JobProfiles.search(testData.jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.nameMarcFileForImportUpdate);
        Logs.checkJobStatus(testData.nameMarcFileForImportUpdate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.nameMarcFileForImportUpdate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.checkItemsQuantityInSummaryTable(1, '1');
      },
    );
  });
});
