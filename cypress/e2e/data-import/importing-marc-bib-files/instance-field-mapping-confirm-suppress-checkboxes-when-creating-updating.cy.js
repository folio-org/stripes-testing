import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InstanceRecordEdit from '../../../support/fragments/inventory/instanceRecordEdit';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
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
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
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

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
      });

      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
      // create profiles
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

    beforeEach('Login', () => {
      cy.login(user.username, user.password, {
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        cy.wrap(instanceHrids).each((hrid) => {
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${hrid}"` }).then(
            (instance) => {
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      });
    });

    it(
      'C11087 Instance field mapping: Confirm the "suppress" checkboxes when creating (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const marcFileName = `C11087 autotestFile${getRandomPostfix()}.mrc`;

        // upload a marc file
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileName);
        Logs.checkJobStatus(marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.verifyLogDetailsPageIsOpened(marcFileName);
        FileDetails.openJsonScreen(instanceTitle);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.openMarcSrsTab();
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
      { tags: ['extendedPath', 'folijet'] },
      () => {
        const marcFileName = `C11088 autotestFile${getRandomPostfix()}.mrc`;
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
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        };

        const matchProfile = {
          profileName: `C11088 autotest MatchProf${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          instanceOption: NewMatchProfile.optionsList.instanceHrid,
        };

        const jobProfileUpdate = {
          profileName: `C11088 autotest update JobProf${getRandomPostfix()}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        };

        // upload a marc file
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileName);
        Logs.checkJobStatus(marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
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
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedFileName, fileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForUpdate);
        Logs.checkJobStatus(fileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdate);
        FileDetails.openJsonScreen(instanceTitle);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.openMarcSrsTab();
        JsonScreenView.getInstanceHrid().then((instanceHrid) => {
          const hrid = instanceHrid;

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.selectYesfilterStaffSuppress();
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
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileUpdate.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfileUpdate.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfileUpdate.name);
        FileManager.deleteFile(`cypress/fixtures/${editedFileName}`);
      },
    );
  });
});
