import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe.skip('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
    const quantityOfItems = '1';
    // unique file names
    const marcFileForCreate = `C17019 oneMarcBib${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C17019 editedMarcFile${getRandomPostfix()}.mrc`;
    const fileNameForUpdate = `C17019 marcFileForUpdate${getRandomPostfix()}.mrc`;
    // profiles for updating instance
    const instanceMappingProfile = {
      name: `C17019 autotest instance mapping profile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
      statisticalCodeUI: 'Book, print (books)',
      instanceStatus: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
    };
    const marcBibMappingProfile = {
      name: `C17019 autotest marc bib mapping profile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const instanceActionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C17019 autotest instance action profile.${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const marcBibActionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C17019 autotest marc bib action profile.${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const matchProfile = {
      profileName: `C17019 autotest match profile.${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C17019 autotest job profile.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('login', () => {
      cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(instanceActionProfile.name);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(marcBibActionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(instanceMappingProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(marcBibMappingProfile.name);
        // delete created files
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    // skip until FAT-5907 will be reviewed
    it(
      'C17019 Check that MARC Update select fields works properly (folijet)',
      { tags: ['criticalPath', 'folijet', 'nonParallel'] },
      () => {
        cy.getAdminToken();
        DataImport.uploadFileViaApi(
          'oneMarcBib.mrc',
          marcFileForCreate,
          'Default - Create instance and SRS MARC Bib',
        ).then((response) => {
          instanceHrid = response.relatedInstanceInfo.hridList[0];

          // change Instance HRID in .mrc file
          DataImport.editMarcFile(
            'oneMarcBib.mrc',
            editedMarcFileName,
            ['ocn962073864'],
            [instanceHrid],
          );
        });

        // create field mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
        NewFieldMappingProfile.addStatisticalCode(instanceMappingProfile.statisticalCode, 8);
        NewFieldMappingProfile.fillInstanceStatusTerm(instanceMappingProfile.statusTerm);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(instanceMappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(instanceMappingProfile.name);
        FieldMappingProfileView.closeViewMode(instanceMappingProfile.name);

        FieldMappingProfiles.openNewMappingProfileForm();
        FieldMappingProfiles.createMappingProfileForUpdatesMarc(marcBibMappingProfile);
        FieldMappingProfileView.checkUpdatesSectionOfMappingProfile(marcBibMappingProfile);
        FieldMappingProfileView.checkOverrideProtectedSection(marcBibMappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(marcBibMappingProfile.name);

        // create action profiles
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(instanceActionProfile, instanceMappingProfile.name);
        ActionProfiles.checkActionProfilePresented(instanceActionProfile.name);

        ActionProfiles.create(marcBibActionProfile, marcBibMappingProfile.name);
        ActionProfiles.checkActionProfilePresented(marcBibActionProfile.name);

        // create match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create job profiles
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchAndTwoActionProfiles(
          matchProfile.profileName,
          marcBibActionProfile.name,
          instanceActionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, fileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForUpdate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems, 1);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 1);

        // check updated instance in Inventory
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InstanceRecordView.verifyStatisticalCode(instanceMappingProfile.statisticalCodeUI);
        InstanceRecordView.verifyInstanceStatusTerm(instanceMappingProfile.instanceStatus);
        InstanceRecordView.viewSource();
      },
    );
  });
});
