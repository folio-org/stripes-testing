import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportNewJobProfile from '../../../../support/fragments/data-export/exportJobProfile/exportNewJobProfile';
import DeleteFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/deleteFieldMappingProfile';
import ExportNewFieldMappingProfile from '../../../../support/fragments/data-export/exportMappingProfile/exportNewFieldMappingProfile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import ActionProfiles from '../../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfileView from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Version history', () => {
    describe('Item', () => {
      const testData = {
        marcFilePath: 'oneMarcBib.mrc',
        marcFileName: `C655279 autotestFileName${getRandomPostfix()}.mrc`,
        csvFileName: `C655279 autotestFile${getRandomPostfix()}.csv`,
        exportedFileName: `C655279 exportedMarcFile${getRandomPostfix()}.mrc`,
        fileNameForUpdate: `C655279 updatedMarcFile${getRandomPostfix()}.mrc`,
      };
      const instanceActionProfileName = 'Default - Create instance';
      const collectionOfCreateProfiles = [
        {
          mappingProfile: {
            name: `C655279 holdings mapping profile ${getRandomPostfix()}`,
            permanentLocation: null,
          },
          actionProfile: {
            name: `C655279 holdings action profile ${getRandomPostfix()}`,
            action: 'CREATE',
            folioRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          },
        },
        {
          mappingProfile: {
            name: `C655279 item mapping profile ${getRandomPostfix()}`,
            materialType: null,
            permanentLoanType: null,
            status: ITEM_STATUS_NAMES.AVAILABLE,
          },
          actionProfile: {
            name: `C655279 item action profile ${getRandomPostfix()}`,
            action: 'CREATE',
            folioRecordType: EXISTING_RECORD_NAMES.ITEM,
          },
        },
      ];
      const createJobProfile = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `C655279 create job profile ${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };
      const exportMappingProfileName = `C655279 Export Item HRID ${getRandomPostfix()}`;
      const exportJobProfileName = `C655279 Export Job Profile ${getRandomPostfix()}`;
      const mappingProfile = {
        name: `C655279 Update Item with stat codes ${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.ITEM,
        statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
        statisticalCodeUI: 'Book, print (books)',
      };
      const actionProfile = {
        typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C655279 Update Item with stat codes ${getRandomPostfix()}`,
        action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
      };
      const matchProfile = {
        profileName: `C655279 900 $a to Item HRID match ${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '900',
          in1: '',
          in2: '',
          subfield: 'a',
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: EXISTING_RECORD_NAMES.ITEM,
        itemOption: NewMatchProfile.optionsList.itemHrid,
      };
      const jobProfile = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `C655279 Update Item with stat code ${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.then(() => {
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            collectionOfCreateProfiles[1].mappingProfile.permanentLoanType = res[0].name;
          });
          cy.getDefaultMaterialType().then((matType) => {
            collectionOfCreateProfiles[1].mappingProfile.materialType = matType.name;
          });
          cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
            (location) => {
              collectionOfCreateProfiles[0].mappingProfile.permanentLocation = `${location.name} (${location.code})`;
            },
          );
          ActionProfiles.getActionProfilesViaApi({
            query: `name="${instanceActionProfileName}"`,
          }).then(({ actionProfiles }) => {
            testData.instanceActionProfileId = actionProfiles[0].id;
          });
        })
          .then(() => {
            NewFieldMappingProfile.createHoldingsMappingProfileViaApi(
              collectionOfCreateProfiles[0].mappingProfile,
            ).then((mappingProfileResponse) => {
              NewActionProfile.createActionProfileViaApi(
                collectionOfCreateProfiles[0].actionProfile,
                mappingProfileResponse.body.id,
              ).then((actionProfileResponse) => {
                collectionOfCreateProfiles[0].actionProfile.id = actionProfileResponse.body.id;
              });
            });
            NewFieldMappingProfile.createItemMappingProfileViaApi(
              collectionOfCreateProfiles[1].mappingProfile,
            )
              .then((mappingProfileResponse) => {
                NewActionProfile.createActionProfileViaApi(
                  collectionOfCreateProfiles[1].actionProfile,
                  mappingProfileResponse.body.id,
                ).then((actionProfileResponse) => {
                  collectionOfCreateProfiles[1].actionProfile.id = actionProfileResponse.body.id;
                });
              })
              .then(() => {
                NewJobProfile.createJobProfileWithLinkedThreeActionProfilesViaApi(
                  { name: createJobProfile.profileName },
                  testData.instanceActionProfileId,
                  collectionOfCreateProfiles[0].actionProfile.id,
                  collectionOfCreateProfiles[1].actionProfile.id,
                );
              });
          })
          .then(() => {
            DataImport.uploadFileViaApi(
              testData.marcFilePath,
              testData.marcFileName,
              createJobProfile.profileName,
            ).then((response) => {
              testData.instanceId = response[0].instance.id;
            });
          });

        cy.getAdminToken();
        ExportNewFieldMappingProfile.createNewFieldMappingProfileForItemHridViaApi(
          exportMappingProfileName,
          '900',
          'a',
        ).then((response) => {
          testData.exportMappingProfileId = response.body.id;
          ExportNewJobProfile.createNewJobProfileViaApi(
            exportJobProfileName,
            response.body.id,
          ).then((jpResponse) => {
            testData.exportJobProfileId = jpResponse.body.id;
          });
        });

        cy.createTempUser([]).then((userProperties) => {
          testData.user = userProperties;

          cy.assignCapabilitiesToExistingUser(
            testData.user.userId,
            [],
            [
              CapabilitySets.uiInventory,
              CapabilitySets.uiDataImportSettingsManage,
              CapabilitySets.uiDataImport,
              CapabilitySets.uiDataExportEdit,
              CapabilitySets.uiDataExportSettingsEdit,
            ],
          );

          cy.login(testData.user.username, testData.user.password);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyInstanceRecordViewOpened();
        });
      });

      after('Delete test data', () => {
        FileManager.deleteFile(`cypress/fixtures/${testData.exportedFileName}`);
        FileManager.deleteFile(`cypress/downloads/${testData.exportedFileName}`);
        cy.getAdminToken().then(() => {
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
          SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
          ExportJobProfiles.deleteJobProfileViaApi(testData.exportJobProfileId);
          DeleteFieldMappingProfile.deleteFieldMappingProfileViaApi(
            testData.exportMappingProfileId,
          );
          SettingsJobProfiles.deleteJobProfileByNameViaApi(createJobProfile.profileName);
          collectionOfCreateProfiles.forEach((profile) => {
            SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
            SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
              profile.mappingProfile.name,
            );
          });
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instanceId);
          Users.deleteViaApi(testData.user.userId);
        });
      });

      it(
        'C655279 Check "Version history" after updating Item via Data import (folijet)',
        { tags: ['criticalPath', 'folijet', 'C655279'] },
        () => {
          InstanceRecordView.exportInstanceMarc();
          cy.intercept('/data-export/quick-export').as('getIds');
          cy.wait('@getIds', getLongDelay()).then((req) => {
            const expectedIDs = req.request.body.uuids;

            FileManager.createFile(
              `cypress/fixtures/${testData.csvFileName}`,
              `"${expectedIDs[0]}"`,
            );
          });

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          ExportFile.uploadFile(testData.csvFileName);
          ExportFile.exportWithCreatedJobProfile(testData.csvFileName, exportJobProfileName);
          ExportFile.downloadExportedMarcFile(testData.exportedFileName);
          FileManager.deleteFile(`cypress/fixtures/${testData.csvFileName}`);
          FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');

          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
          NewFieldMappingProfile.addStatisticalCode(mappingProfile.statisticalCode, 6);
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(mappingProfile.name);
          FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          SettingsActionProfiles.create(actionProfile, mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          MatchProfiles.createMatchProfile(matchProfile);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.createJobProfileWithLinkingProfiles(
            jobProfile,
            actionProfile.name,
            matchProfile.profileName,
          );
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.verifyUploadState();
          DataImport.uploadFile(testData.exportedFileName, testData.fileNameForUpdate);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.checkJobStatus(testData.fileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(testData.fileNameForUpdate);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.item,
          );
          FileDetails.openItemInInventory(RECORD_STATUSES.UPDATED);
          ItemRecordView.verifyStatisticalCode(mappingProfile.statisticalCodeUI);
          ItemRecordView.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionsCount(2);
          VersionHistorySection.verifyCurrentVersionCard({
            index: 0,
            firstName: testData.user.firstName,
            lastName: testData.user.lastName,
            changes: ['Statistical codes (Added)'],
          });
        },
      );
    });
  });
});
