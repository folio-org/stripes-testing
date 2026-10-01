import {
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  INVENTORY_008_FIELD_DTST_DROPDOWN,
  INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {};
    const randomPostfix = getRandomPostfix();
    const originalFile = 'marcBibFileForC397992.mrc';
    const preupdatedFile = 'marcBibFileForC397992_preupdated.mrc';
    const marcBibFileName = `AT_C397992_marcBibFile_${randomPostfix}.mrc`;
    const csvFileName = `AT_C397992_exportList_${randomPostfix}.csv`;
    const exportedMarcFileName = `AT_C397992_exportedMarc_${randomPostfix}.mrc`;
    const updatedMarcFileName = `AT_C397992_updatedMarc_${randomPostfix}.mrc`;
    const tag008 = '008';

    const mappingProfile = { name: `AT_C397992_MappingProfile_${randomPostfix}` };
    const actionProfile = {
      name: `AT_C397992_ActionProfile_${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const matchProfile = {
      profileName: `AT_C397992_MatchProfile_${randomPostfix}`,
      incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = { profileName: `AT_C397992_JobProfile_${randomPostfix}` };

    const field008DropdownValues = [
      {
        dropdownLabel: INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES.DTST,
        option: INVENTORY_008_FIELD_DTST_DROPDOWN.M,
      },
    ];

    before('Create test data via API', () => {
      cy.getAdminToken();

      DataImport.uploadFileViaApi(
        originalFile,
        marcBibFileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      )
        .then((response) => {
          testData.instanceId = response[0].instance.id;
        })
        .then(() => {
          return FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.instanceId);
        })
        .then(() => {
          return ExportFile.exportFileViaApi(csvFileName).then(() => {
            ExportFile.downloadExportedMarcFile(exportedMarcFileName);
          });
        })
        .then(() => {
          DataImport.replace999SubfieldsInPreupdatedFile(
            exportedMarcFileName,
            preupdatedFile,
            updatedMarcFileName,
          );
        })
        .then(() => {
          return NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile)
            .then((fmpResponse) => {
              mappingProfile.id = fmpResponse.body.id;
              return NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id);
            })
            .then((apResponse) => {
              actionProfile.id = apResponse.body.id;
              return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
                matchProfile,
              );
            })
            .then((mpResponse) => {
              matchProfile.id = mpResponse.body.id;
              return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                jobProfile.profileName,
                matchProfile.id,
                actionProfile.id,
              );
            });
        })
        .then(() => {
          return DataImport.uploadFileViaApi(
            updatedMarcFileName,
            updatedMarcFileName,
            jobProfile.profileName,
          );
        })
        .then(() => {
          return cy
            .createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.moduleDataImportEnabled.gui,
              Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
            ])
            .then((userProperties) => {
              testData.user = userProperties;
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user?.userId);
      if (testData.instanceId) InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedMarcFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${updatedMarcFileName}`);
      FileManager.deleteFile(`cypress/downloads/${exportedMarcFileName}`);
    });

    it(
      'C397992 Remove "008" field from "MARC Bib" record via Data Import and then add new "008" in UI (promin)',
      { tags: ['extendedPath', 'promin', 'C397992'] },
      () => {
        // Step 12: Open MARC bib editor; verify 008 field is not shown
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkTagAbsent(tag008);

        // Step 13: Add new 008 field; select values in highlighted dropdowns
        QuickMarcEditor.addNewField(tag008, '', 3);
        field008DropdownValues.forEach((field008DropdownValue) => {
          QuickMarcEditor.selectFieldsDropdownOption(
            tag008,
            field008DropdownValue.dropdownLabel,
            field008DropdownValue.option,
          );
          cy.wait(500);
        });
        QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(tag008, false);

        // Step 14: Save & close
        QuickMarcEditor.pressSaveAndCloseButton();
        QuickMarcEditor.checkAfterSaveAndClose();
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();

        // Steps 16-17: Reopen editor; verify 008 positions; verify Entered date
        cy.intercept('/records-editor/records**').as('recordLoaded');
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.waitLoading();
        field008DropdownValues.forEach((field008DropdownValue) => {
          QuickMarcEditor.verifyFieldsDropdownOption(
            tag008,
            field008DropdownValue.dropdownLabel,
            field008DropdownValue.option,
          );
        });
        cy.wait('@recordLoaded').then(({ response }) => {
          const targetField = response.body.fields.find((field) => field.tag === tag008);
          expect(targetField.content.Entered).to.eq(DateTools.getCurrentDateYYMMDD());
        });
      },
    );
  });
});
