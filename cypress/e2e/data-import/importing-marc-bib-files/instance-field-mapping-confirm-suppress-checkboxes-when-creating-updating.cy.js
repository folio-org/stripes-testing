import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  JOB_STATUS_NAMES,
  EXISTING_RECORDS_NAMES,
} from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import FileManager from '../../../support/utils/fileManager';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const instanceHrids = [];
    const checked = true;
    const instanceTitle =
      "101 things I wish I'd known when I started using hypnosis / Dabney Ewin.";
    const filePathToUpload = 'marcBibFileForC11087.mrc';
    const mappingProfile = {
      name: `autotestMappingProfile_${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      suppressFromDiscavery: 'Mark for all affected records',
      staffSuppress: 'Unmark for all affected records',
      previouslyHeld: 'Keep the existing value for all affected records',
    };
    const actionProfile = {
      name: `autotestActionProfile_${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };
    const jobProfile = {
      profileName: `autotestJobProfile_${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
      // create mapping profiles
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
      NewFieldMappingProfile.addStaffSuppress(mappingProfile.staffSuppress);
      NewFieldMappingProfile.addSuppressFromDiscovery(mappingProfile.suppressFromDiscavery);
      NewFieldMappingProfile.addPreviouslyHeld(mappingProfile.previouslyHeld);
      NewFieldMappingProfile.save();
      FieldMappingProfileView.closeViewMode(mappingProfile.name);
      FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(actionProfile.name);

      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfile(actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);
    });

    after('delete test data', () => {
      cy.getAdminToken();
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      cy.wrap(instanceHrids).each((hrid) => {
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${hrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C11087 Instance field mapping: Confirm the "suppress" checkboxes when creating (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const marcFileName = `C11087 autotestFile_${getRandomPostfix()}.mrc`;

        // upload a marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, marcFileName);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.verifyLogDetailsPageIsOpened();
        FileDetails.openJsonScreen(instanceTitle);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.getInstanceHrid().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyMarkAsSuppressedFromDiscovery();
          InstanceRecordView.verifyNotMarkAsStaffSuppressed();
          InstanceRecordView.verifyNotMarkAsPreviouslyHeld();
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.verifyDiscoverySuppressCheckbox(checked);
          InstanceRecordEdit.verifyStaffSuppressCheckbox();
          InstanceRecordEdit.verifyPreviouslyHeldCheckbox();
        });
      },
    );

    it(
      'C11088 Instance field mapping: Confirm the "suppress" checkboxes when updating (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const marcFileName = `C11088 autotestFile_${getRandomPostfix()}.mrc`;
        const editedFileName = `C11088 editedAutotestFile_${getRandomPostfix()}.mrc`;
        const fileNameForUpdate = `C11088 autotestFile_${getRandomPostfix()}.mrc`;
        const mappingProfileUpdate = {
          name: `C11088 autotest update MappingProf${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          suppressFromDiscavery: 'Unmark for all affected records',
          staffSuppress: 'Keep the existing value for all affected records',
          previouslyHeld: 'Mark for all affected records',
        };

        const actionProfileUpdate = {
          name: `C11088 autotest update ActionProf${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        };

        const matchProfile = {
          profileName: `C17017 autotest MatchProf${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
          instanceOption: NewMatchProfile.optionsList.instanceHrid,
        };

        const jobProfileUpdate = {
          profileName: `C17017 autotest update JobProf${getRandomPostfix()}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        };

        // upload a marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, marcFileName);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.openInstanceInInventory('Created');
        InstanceRecordView.verifyInstancePaneExists();
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          const instanceHrid = initialInstanceHrId;
          instanceHrids.push(instanceHrid);

          DataImport.editMarcFile(filePathToUpload, editedFileName, ['303845'], [instanceHrid]);
          InstanceRecordView.edit();
          InstanceRecordEdit.waitLoading();
          InstanceRecordEdit.markAsStaffSuppress();
          InstanceRecordEdit.saveAndClose();
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyMarkAsSuppressedFromDiscoveryAndSuppressed();
        });
        // create mapping profile for update
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfileUpdate);
        NewFieldMappingProfile.addStaffSuppress(mappingProfileUpdate.staffSuppress);
        NewFieldMappingProfile.addSuppressFromDiscovery(mappingProfileUpdate.suppressFromDiscavery);
        NewFieldMappingProfile.addPreviouslyHeld(mappingProfileUpdate.previouslyHeld);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfileUpdate.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfileUpdate.name);

        // create action profile for update
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfileUpdate, mappingProfileUpdate.name);
        ActionProfiles.checkActionProfilePresented(actionProfileUpdate.name);

        // create match profile for update
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);

        // create job profile for update
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfileUpdate,
          actionProfileUpdate.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfileUpdate.profileName);

        // upload a marc file for updating already created instance
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedFileName, fileNameForUpdate);
        JobProfiles.search(jobProfileUpdate.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileNameForUpdate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdate);
        FileDetails.openJsonScreen(instanceTitle);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.getInstanceHrid().then((instanceHrid) => {
          const hrid = instanceHrid;

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(hrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyNotMarkAssuppressFromDiscavery();
          InstanceRecordView.verifyMarkedAsStaffSuppressed();
          InstanceRecordView.verifyMarkedAsPreviouslyHeld();
          InstanceRecordView.edit();
          InstanceRecordEdit.verifyDiscoverySuppressCheckbox(false);
          InstanceRecordEdit.verifyStaffSuppressCheckbox(checked);
          InstanceRecordEdit.verifyPreviouslyHeldCheckbox(checked);
        });

        // delete profiles
        JobProfiles.deleteJobProfile(jobProfileUpdate.profileName);
        MatchProfiles.deleteMatchProfile(matchProfile.profileName);
        ActionProfiles.deleteActionProfile(actionProfileUpdate.name);
        FieldMappingProfileView.deleteViaApi(mappingProfileUpdate.name);
        FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      },
    );
  });
});
