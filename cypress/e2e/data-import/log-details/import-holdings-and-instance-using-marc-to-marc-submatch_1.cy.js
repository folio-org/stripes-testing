import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  HOLDINGS_TYPE_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import Helper from '../../../support/fragments/finance/financeHelper';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import NewInstanceStatusType from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/newInstanceStatusType';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    const testData = {
      protectedField: '856',
      protectedFieldId: null,
      fileName: 'marcFileForSubmatch.mrc',
      newUri: 'http://jbjjhhjj:3000/Test2',
    };
    let user;
    const instanceHrids = [];
    // profiles for create
    const collectionOfMappingAndActionProfilesForCreate = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C397984 Create ER Instance ${getRandomPostfix()}`,
          instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.ELECTRONIC_RESOURCE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C397984 Create ER Instance ${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C397984 Create ER Holdings ${getRandomPostfix()}`,
          holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
          permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
          relationship: '"Resource"',
          uri: '856$u',
          linkText: '856$y',
          materialsSpecified: '856$3',
          urlPublicNote: '856$z',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C397984 Create ER Holdings ${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfileForCreate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C397984 Create ER Instance and Holdings ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const fileNameForCreate = `C397984 autotestFileForCreate${getRandomPostfix()}.mrc`;
    const fileNameForUpdate = `C397984 autotestFileForUpdate${getRandomPostfix()}.mrc`;
    const editedMarcFileNameForCreate = `C397984 editedAutotestFileForCreate${getRandomPostfix()}.mrc`;
    const editedMarcFileNameForUpdate = `C397984 editedAutotestFileForUpdate${getRandomPostfix()}.mrc`;
    const uniq001Field = Helper.getRandomBarcode();
    const newUri = 'http://jbjjhhjj:3000/Test';
    // profiles for update
    const collectionOfMappingAndActionProfilesForUpdate = [
      {
        mappingProfile: {
          name: `C397984 Override 856 protection ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
          name: `C397984 Update srs override 856 protection ${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
    ];
    const matchProfile = {
      profileName: `C397984 035$a to 035$a match ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '035',
        subfield: 'a',
      },
      existingRecordFields: {
        field: '035',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C397984 035$a to 035$a match with instance status type submatch ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
      ]).then((userProperties) => {
        user = userProperties;

        MarcFieldProtection.createViaApi({
          indicator1: '*',
          indicator2: '*',
          subfield: '*',
          data: '*',
          source: 'USER',
          field: testData.protectedField,
        }).then((resp) => {
          testData.protectedFieldId = resp.id;
        });
        InstanceStatusTypes.getViaApi({ query: '"name"=="Electronic Resource"' }).then((type) => {
          if (type.length === 0) {
            NewInstanceStatusType.createViaApi().then((initialInstanceStatusType) => {
              testData.instanceStatusTypeId = initialInstanceStatusType.body.id;
            });
          }
        });
        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });

        // create Field mapping profiles for creating
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfilesForCreate[0].mappingProfile,
        );
        NewFieldMappingProfile.fillInstanceStatusTerm(
          collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.instanceStatusTerm,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfilesForCreate[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile,
        );
        NewFieldMappingProfile.fillHoldingsType(
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.holdingsType,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.permanentLocation,
        );
        NewFieldMappingProfile.addElectronicAccess(
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.typeValue,
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.relationship,
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.uri,
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.linkText,
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.materialsSpecified,
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.urlPublicNote,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfilesForCreate[1].mappingProfile.name,
        );

        // create action profiles for creating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfMappingAndActionProfilesForCreate.forEach((profile) => {
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        });

        // create job profile for creating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfileForCreate);
        NewJobProfile.linkActionProfileByName(
          collectionOfMappingAndActionProfilesForCreate[0].actionProfile.name,
        );
        NewJobProfile.linkActionProfileByName(
          collectionOfMappingAndActionProfilesForCreate[1].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
      });
    });

    after('Delete test data', () => {
      // delete created files
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForCreate}`);
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForUpdate}`);
      cy.getAdminToken().then(() => {
        MarcFieldProtection.deleteViaApi(testData.protectedFieldId);
        InstanceStatusTypes.deleteViaApi(testData.instanceStatusTypeId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.profileName);
        collectionOfMappingAndActionProfilesForCreate.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        collectionOfMappingAndActionProfilesForUpdate.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        Users.deleteViaApi(user.userId);
        instanceHrids.forEach((hrid) => {
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${hrid}"` }).then(
            (instance) => {
              cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      });
    });

    it(
      'C397984 Verify the ability to import Holdings and Instance using marc-to-marc submatch: 1 match (folijet)',
      { tags: ['criticalPath', 'folijet', 'C397984'] },
      () => {
        // change file for creating uniq 035 field
        DataImport.editMarcFile(
          testData.fileName,
          editedMarcFileNameForCreate,
          ['9000098'],
          [uniq001Field],
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForCreate, fileNameForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForCreate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForCreate);
        Logs.checkJobStatus(fileNameForCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });

        // change file for changing content of 856 field
        DataImport.editMarcFile(
          testData.fileName,
          editedMarcFileNameForUpdate,
          ['9000098', 'http://jbjjhhjj:3000/'],
          [uniq001Field, newUri],
        );

        // create Field mapping profiles for updating
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillMappingProfileForUpdatesMarc(
          collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile,
        );
        NewFieldMappingProfile.markFieldForProtection(testData.protectedField);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.name,
        );

        // create action profiles for updating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        ActionProfiles.create(
          collectionOfMappingAndActionProfilesForUpdate[0].actionProfile,
          collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.name,
        );
        ActionProfiles.checkActionProfilePresented(
          collectionOfMappingAndActionProfilesForUpdate[0].actionProfile.name,
        );

        // create match profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create job profile for updating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfileForUpdate,
          collectionOfMappingAndActionProfilesForUpdate[0].actionProfile.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForUpdate, fileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForUpdate);
        Logs.checkJobStatus(fileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InventoryInstance.getAssignedHRID().then((hrId) => {
          instanceHrids.push(hrId);
        });
        InstanceRecordView.verifyElectronicAccess(newUri);
        InstanceRecordView.verifyElectronicAccessAbsent(1);
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(testData.protectedField, newUri);
      },
    );
  });
});
