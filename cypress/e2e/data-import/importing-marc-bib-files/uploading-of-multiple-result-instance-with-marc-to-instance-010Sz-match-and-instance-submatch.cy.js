import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
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
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe(
    'Importing MARC Bib files',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      const testData = {
        filePath: 'marcBibFileForC476729.mrc',
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        fileNameForCreate: `C476729 marcFileName${getRandomPostfix()}.mrc`,
        fileNameForUpdate: `C476729 marcFileName${getRandomPostfix()}.mrc`,
        instanceIds: [],
        identifire: {
          type: 'Canceled LCCN',
          value: 'CNRTESTNEW',
        },
      };
      const mappingProfile = {
        name: `C476729 Update Instance with Instance status term${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
        statisticalCodeUI: 'Book, print (books)',
      };
      const actionProfile = {
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C476729 Update Instance with Instance status term${getRandomPostfix()}`,
        action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
      };
      const matchProfiles = [
        {
          matchProfile: {
            profileName: `C476729 010$z-to-Instance match${getRandomPostfix()}`,
            incomingRecordFields: {
              field: '010',
              subfield: 'z',
            },
            matchCriterion: 'Exactly matches',
            existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
            instanceOption: NewMatchProfile.optionsList.identifierCanceledLCCN,
          },
        },
        {
          matchProfile: {
            profileName: `C476729 Instance status submatch - Cataloged ${getRandomPostfix()}`,
            incomingStaticValue: 'Cataloged',
            incomingStaticRecordValue: 'Text',
            matchCriterion: 'Exactly matches',
            existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
            existingRecordOption: NewMatchProfile.optionsList.instanceStatusTerm,
          },
        },
      ];
      const jobProfile = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `C476729 010z to 010$z match with cat status match${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      before('Create test user and login', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.settingsDataImportEnabled.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          InventorySearchAndFilter.getInstancesByIdentifierViaApi(testData.identifire.value).then(
            (response) => {
              if (response.totalRecords !== 0) {
                response.instances.forEach(({ id }) => {
                  InstanceRecordView.markAsDeletedViaApi(id);
                  InventoryInstance.deleteInstanceViaApi(id);
                });
              }
            },
          );

          DataImport.uploadFileViaApi(
            testData.filePath,
            testData.fileNameForCreate,
            testData.jobProfileToRun,
          ).then((response) => {
            testData.instanceIds.push(response[0].instance.id);
          });
          DataImport.uploadFileViaApi(
            testData.filePath,
            testData.fileNameForCreate,
            testData.jobProfileToRun,
          ).then((response) => {
            testData.instanceIds.push(response[0].instance.id);
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken().then(() => {
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
          matchProfiles.forEach((profile) => {
            SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
          });
          SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
          Users.deleteViaApi(testData.user.userId);
          testData.instanceIds.forEach((id) => {
            InstanceRecordView.markAsDeletedViaApi(id);
            InventoryInstance.deleteInstanceViaApi(id);
          });
        });
      });

      it(
        'C476729 Updating of multiple result instance with marc-to-Instance 010$z match and instance submatch (folijet)',
        { tags: ['criticalPath', 'folijet', 'C476729'] },
        () => {
          InventorySearchAndFilter.searchInstanceByTitle(testData.instanceIds[0]);
          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.chooseInstanceStatusTerm('Cataloged');
          InstanceRecordEdit.saveAndClose();
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyInstanceStatusTerm(INSTANCE_STATUS_TERM_NAMES.CATALOGED);

          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
          NewFieldMappingProfile.addStatisticalCode(mappingProfile.statisticalCode, 8);
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(mappingProfile.name);
          FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          SettingsActionProfiles.create(actionProfile, mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          MatchProfiles.createMatchProfile(matchProfiles[0].matchProfile);
          MatchProfiles.checkMatchProfilePresented(matchProfiles[0].matchProfile.profileName);
          cy.wait(3000);
          MatchProfiles.createMatchProfileWithStaticValue(matchProfiles[1].matchProfile);
          MatchProfiles.checkMatchProfilePresented(matchProfiles[1].matchProfile.profileName);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.openNewJobProfileForm();
          NewJobProfile.fillJobProfile(jobProfile);
          NewJobProfile.linkMatchProfile(matchProfiles[0].matchProfile.profileName);
          NewJobProfile.linkMatchAndActionProfilesForSubMatches(
            matchProfiles[1].matchProfile.profileName,
            actionProfile.name,
          );
          NewJobProfile.saveAndClose();
          JobProfiles.waitLoadingList();
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);

          // upload a marc file for updating already created instance
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.verifyUploadState();
          DataImport.uploadFile(testData.filePath, testData.fileNameForUpdate);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(testData.fileNameForUpdate);
          Logs.checkJobStatus(testData.fileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(testData.fileNameForUpdate);
          FileDetails.checkStatusInColumn(
            RECORD_STATUSES.UPDATED,
            FileDetails.columnNameInResultList.instance,
          );
          FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
          InstanceRecordView.verifyStatisticalCode(mappingProfile.statisticalCodeUI);
          InstanceRecordView.verifyResourceIdentifier(
            testData.identifire.type,
            testData.identifire.value,
            0,
          );
        },
      );
    },
  );
});
