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
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
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
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import NewInstanceStatusType from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/newInstanceStatusType';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
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
          name: `Create ER Instance ${getRandomPostfix()}`,
          instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.ELECTRONIC_RESOURCE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `Create ER Instance ${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `Create ER Holdings ${getRandomPostfix()}`,
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
          name: `Create ER Holdings ${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfileForCreate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `Create ER Instance and Holdings ${getRandomPostfix()}`,
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
        JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);
      });
    });

    beforeEach('Login', () => {
      cy.login(user.username, user.password, {
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
    });

    after('Delete test data', () => {
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
      'C397983 Verify the ability to import Holdings and Instance using marc-to-marc submatch: 2 matches (folijet)',
      { tags: ['criticalPath', 'folijet', 'C397983'] },
      () => {
        const fileNameForCreate = `C397983 autotestFileForCreate${getRandomPostfix()}.mrc`;
        const fileNameForUpdate = `C397983 autotestFileForUpdate${getRandomPostfix()}.mrc`;
        const editedMarcFileNameForCreate = `C397983 editedAutotestFileForCreate${getRandomPostfix()}.mrc`;
        const editedMarcFileNameForUpdate = `C397983 editedAutotestFileForUpdate${getRandomPostfix()}.mrc`;
        const uniq001Field = Helper.getRandomBarcode();
        const newUri = 'http://jbjjhhjj:3000/Test2';
        // profiles for update
        const collectionOfMappingAndActionProfilesForUpdate = [
          {
            mappingProfile: {
              name: `C397983 Override 856 protection ${getRandomPostfix()}`,
              typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
            },
            actionProfile: {
              typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
              name: `C397983 Update srs override 856 protection ${getRandomPostfix()}`,
              action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
            },
          },
        ];
        const collectionOfMatchProfiles = [
          {
            matchProfile: {
              profileName: `C397983 Instance status submatch - Electronic Resource ${getRandomPostfix()}`,
              incomingStaticValue: 'Electronic Resource',
              incomingStaticRecordValue: 'Text',
              matchCriterion: 'Exactly matches',
              existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
              existingRecordOption: NewMatchProfile.optionsList.instanceStatusTerm,
            },
          },
          {
            matchProfile: {
              profileName: `C397983 035$a to 035$a match ${getRandomPostfix()}`,
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
            },
          },
        ];
        const jobProfileForUpdate = {
          ...NewJobProfile.defaultJobProfile,
          profileName: `C397983 035$a to 035$a match with instance status type submatch ${getRandomPostfix()}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        };

        // change file for creating uniq 035 field
        DataImport.editMarcFile(
          testData.fileName,
          editedMarcFileNameForCreate,
          ['9000098'],
          [uniq001Field],
        );

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
        MatchProfiles.createMatchProfileWithStaticValue(collectionOfMatchProfiles[0].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[0].matchProfile.profileName,
        );
        cy.wait(1000);
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[1].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[1].matchProfile.profileName,
        );

        // create job profile for updating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfileForUpdate);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[1].matchProfile.profileName);
        NewJobProfile.linkMatchAndActionProfilesForSubMatches(
          collectionOfMatchProfiles[0].matchProfile.profileName,
          collectionOfMappingAndActionProfilesForUpdate[0].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.waitLoadingList();
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
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.srsMarc,
        );
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InventoryInstance.getAssignedHRID().then((hrId) => {
          instanceHrids.push(hrId);
        });
        InstanceRecordView.verifyElectronicAccess(newUri);
        InstanceRecordView.verifyElectronicAccessAbsent(1);
        InstanceRecordView.viewSource();
        InventoryViewSource.verifyFieldInMARCBibSource(testData.protectedField, newUri);

        cy.getAdminToken().then(() => {
          // delete profiles
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(
            collectionOfMatchProfiles[1].matchProfile.profileName,
          );
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(
            collectionOfMatchProfiles[0].matchProfile.profileName,
          );
          collectionOfMappingAndActionProfilesForUpdate.forEach((profile) => {
            SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
            SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
              profile.mappingProfile.name,
            );
          });
        });
        // delete created files
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForCreate}`);
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForUpdate}`);
      },
    );

    it(
      'C397984 Verify the ability to import Holdings and Instance using marc-to-marc submatch: 1 match (folijet)',
      { tags: ['criticalPath', 'folijet', 'C397984'] },
      () => {
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

        // change file for creating uniq 035 field
        DataImport.editMarcFile(
          testData.fileName,
          editedMarcFileNameForCreate,
          ['9000098'],
          [uniq001Field],
        );

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

        cy.getAdminToken().then(() => {
          // delete profiles
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
          collectionOfMappingAndActionProfilesForUpdate.forEach((profile) => {
            SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
            SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
              profile.mappingProfile.name,
            );
          });
        });
        // delete created files
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForCreate}`);
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForUpdate}`);
      },
    );

    it(
      'C397383 Verify the ability to import Holdings and Instance using marc-to-marc submatch: 3 matches (folijet)',
      { tags: ['smoke', 'folijet', 'C397383'] },
      () => {
        const fileNameForCreate = `C397383 autotestFileForCreate${getRandomPostfix()}.mrc`;
        const fileNameForUpdate = `C397383 autotestFileForUpdate${getRandomPostfix()}.mrc`;
        const editedMarcFileNameForCreate = `C397383 editedAutotestFileForCreate${getRandomPostfix()}.mrc`;
        const editedMarcFileNameForUpdate = `C397383 editedAutotestFileForUpdate${getRandomPostfix()}.mrc`;
        const uniq001Field = Helper.getRandomBarcode();
        const newUri = 'http://jbjjhhjj:3000/Test3';
        // profiles for update
        const collectionOfMappingAndActionProfilesForUpdate = [
          {
            mappingProfile: {
              name: `C397383 Override 856 protection ${getRandomPostfix()}`,
              typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
            },
            actionProfile: {
              typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
              name: `C397383 Update srs override 856 protection ${getRandomPostfix()}`,
              action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
            },
          },
          {
            mappingProfile: {
              name: `C397383 Update ER holdings ${getRandomPostfix()}`,
              typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
              holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
              permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
            },
            actionProfile: {
              typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
              name: `C397383 Update ER Holdings ${getRandomPostfix()}`,
              action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
            },
          },
        ];
        const collectionOfMatchProfiles = [
          {
            matchProfile: {
              profileName: `C397383 035$a to 035$a match ${getRandomPostfix()}`,
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
            },
          },
          {
            matchProfile: {
              profileName: `C397383 Instance status submatch - Electronic Resource ${getRandomPostfix()}`,
              incomingStaticValue: 'Electronic Resource',
              incomingStaticRecordValue: 'Text',
              matchCriterion: 'Exactly matches',
              existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
              existingRecordOption: NewMatchProfile.optionsList.instanceStatusTerm,
            },
          },
          {
            matchProfile: {
              profileName: `C397383 Holdings type electronic ${getRandomPostfix()}`,
              incomingStaticValue: 'Electronic',
              incomingStaticRecordValue: 'Text',
              matchCriterion: 'Exactly matches',
              existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
              existingRecordOption: NewMatchProfile.optionsList.holdingsType,
            },
          },
        ];
        const jobProfileForUpdate = {
          ...NewJobProfile.defaultJobProfile,
          profileName: `C397383 035$a to 035$a match with instance status and holdings type submatch ${getRandomPostfix()}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        };

        // change file for creating uniq 035 field
        DataImport.editMarcFile(
          testData.fileName,
          editedMarcFileNameForCreate,
          ['9000098'],
          [uniq001Field],
        );

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
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile,
        );
        NewFieldMappingProfile.fillHoldingsType(
          collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.holdingsType,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.permanentLocation,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.name,
        );

        // create action profiles for updating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfMappingAndActionProfilesForUpdate.forEach((profile) => {
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfileWithStaticValue(collectionOfMatchProfiles[2].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[2].matchProfile.profileName,
        );
        cy.wait(1000);
        MatchProfiles.createMatchProfileWithStaticValue(collectionOfMatchProfiles[1].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[1].matchProfile.profileName,
        );
        cy.wait(1000);
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[0].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[0].matchProfile.profileName,
        );

        // create job profile for updating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfileForUpdate);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[0].matchProfile.profileName);
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[1].matchProfile.profileName,
        );
        NewJobProfile.linkMatchAndTwoActionProfilesForSubMatches(
          collectionOfMatchProfiles[2].matchProfile.profileName,
          collectionOfMappingAndActionProfilesForUpdate[0].actionProfile.name,
          collectionOfMappingAndActionProfilesForUpdate[1].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.waitLoadingList();
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
          FileDetails.columnNameInResultList.holdings,
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
        InventoryViewSource.close();
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.checkPermanentLocation(LOCATION_NAMES.ONLINE_UI);

        cy.getAdminToken().then(() => {
          // delete profiles
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
          collectionOfMatchProfiles.forEach((profile) => {
            SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
          });
          collectionOfMappingAndActionProfilesForUpdate.forEach((profile) => {
            SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
            SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
              profile.mappingProfile.name,
            );
          });
        });
        // delete created files
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForCreate}`);
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileNameForUpdate}`);
      },
    );
  });
});
