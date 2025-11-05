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
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MarcFieldProtection from '../../../../support/fragments/settings/dataImport/marcFieldProtection';
import MatchProfiles from '../../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    describe('Consortia', () => {
      const testData = {
        marcFile: {
          marc: 'oneMarcBib.mrc',
          fileName: `C449362 testMarcFile${getRandomPostfix()}.mrc`,
          modifiedMarcFile: `C449362 testMarcFile${getRandomPostfix()}.mrc`,
          editedMarcFile: `C449362 editedTestMarcFile${getRandomPostfix()}.mrc`,
        },
        protectedField: '245',
        existing245field:
          'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)',
        updated245field:
          'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano Updated (founding editor)',
      };
      const mappingProfile = {
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C449362 Update shared instance${getRandomPostfix()}`,
        catalogingDate: '###TODAY###',
        catalogingDateUI: DateTools.getFormattedDate({ date: new Date() }),
        statusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
        adminNotes: `test note${getRandomPostfix()}`,
      };
      const actionProfile = {
        name: `C449362 Update shared instance${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
      };
      const matchProfile = {
        profileName: `C449362 001-to-Instance HRID match${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '001',
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
        instanceOption: NewMatchProfile.optionsList.instanceHrid,
      };
      const jobProfile = {
        profileName: `C449362 001-to-Instance HRID match${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      before('Create test data and login', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;
        });
        cy.setTenant(Affiliations.College);
        MarcFieldProtection.createViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: 'a',
          data: '*',
          source: 'USER',
          field: testData.protectedField,
        }).then((resp) => {
          testData.fieldId = resp.id;
        });
        DataImport.uploadFileViaApi(
          testData.marcFile.marc,
          testData.marcFile.fileName,
          DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        ).then((response) => {
          testData.instanceId = response[0].instance.id;

          InventoryInstance.shareInstanceViaApi(
            testData.instanceId,
            testData.consortiaId,
            Affiliations.College,
            Affiliations.Consortia,
          );
          // skip step with export instance and use existing file
          cy.wait(5000);
          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"id"=="${testData.instanceId}"`,
          }).then((instance) => {
            testData.instanceHrid = instance.hrid;
          });
        });
        cy.resetTenant();

        cy.createTempUser([Permissions.inventoryAll.gui])
          .then((userProperties) => {
            testData.user = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(testData.user.userId, [
              Permissions.inventoryAll.gui,
              Permissions.moduleDataImportEnabled.gui,
              Permissions.settingsDataImportEnabled.gui,
              Permissions.consortiaCentralAll.gui,
            ]);
            cy.resetTenant();

            cy.login(testData.user.username, testData.user.password);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
      });

      after('Delete test data', () => {
        // delete created files in fixtures
        FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedMarcFile}`);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.resetTenant();
        cy.setTenant(Affiliations.College);
        MarcFieldProtection.deleteViaApi(testData.fieldId);
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });

      it(
        'C449362 (CONSORTIA) Title of shared instance is not updated with protected field on Member tenant (consortia) (folijet)',
        { tags: ['extendedPathECS', 'folijet', 'C449362'] },
        () => {
          // change file
          // we change instance hrid because using existing file
          DataImport.editMarcFile(
            testData.marcFile.marc,
            testData.marcFile.modifiedMarcFile,
            ['ocn962073864', testData.existing245field],
            [testData.instanceHrid, testData.updated245field],
          );

          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
          NewFieldMappingProfile.fillCatalogedDate(mappingProfile.catalogingDate);
          NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfile.statusTerm);
          NewFieldMappingProfile.addAdministrativeNote(mappingProfile.adminNotes, 9);
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(mappingProfile.name);
          FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          SettingsActionProfiles.create(actionProfile, mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          MatchProfiles.createMatchProfile(matchProfile);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.createJobProfile(jobProfile);
          NewJobProfile.linkMatchProfile(matchProfile.profileName);
          NewJobProfile.linkActionProfileForMatches(actionProfile.name);
          NewJobProfile.saveAndClose();
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.verifyUploadState();
          DataImport.uploadFile(
            testData.marcFile.modifiedMarcFile,
            testData.marcFile.editedMarcFile,
          );
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImportedForConsortia(testData.marcFile.editedMarcFile);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(testData.marcFile.editedMarcFile);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
          });
          FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
          InventoryInstance.waitLoading();
          InstanceRecordView.verifyCatalogedDate(mappingProfile.catalogingDateUI);
          InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.statusTerm);
          InstanceRecordView.verifyInstanceAdministrativeNote(mappingProfile.adminNotes);
          InventoryInstance.verifyInstanceTitle(testData.existing245field);

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstance();
          InstanceRecordView.verifyCatalogedDate(mappingProfile.catalogingDateUI);
          InstanceRecordView.verifyInstanceStatusTerm(mappingProfile.statusTerm);
          InstanceRecordView.verifyInstanceAdministrativeNote(mappingProfile.adminNotes);
          InventoryInstance.verifyInstanceTitle(testData.existing245field);
        },
      );
    });
  });
});
