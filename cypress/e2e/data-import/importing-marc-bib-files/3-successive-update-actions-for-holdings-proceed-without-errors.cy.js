import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  HOLDINGS_TYPE_NAMES,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
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
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let user;
    let instanceHrid;
    const holdingsElectronicAccessData = {
      urlRelationship: 'Resource',
      uri: 'http://silk.library.umass.edu/login?url=https://search.ebscohost.com/login.aspx?direct=true&scope=site&db=nlebk&db=nlabk&AN=10241',
      linkTextUMass: 'UMass: Link to resource',
      urlPublicNote: 'EBSCO',
    };
    const callNumberData = {
      callNumberType: 'LC Modified',
      callNumberPrefix: 'TestPref',
      callNumber: '322',
      callNumberSuffix: 'TestSuf',
    };
    const filePathForCreate = 'marcFileForC401727.mrc';
    const marcFileNameForCreate = `C401727 autotestFileNamForCreate${getRandomPostfix()}.mrc`;
    const marcFileNameForUpdate = `C401727 autotestFileNameForUpdate${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C401727 editedAutotestFileName${getRandomPostfix()}.mrc`;
    const holdingsMappingProfile = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C401727 Create simple Holdings ${getRandomPostfix()}}`,
      permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
    };
    const holdingsActionProfile = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C401727 Create simple Holdings ${getRandomPostfix()}`,
    };
    const jobProfile = {
      profileName: `C401727 Create simple Instance and Holdings ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const collectionOfMappingAndActionProfilesForUpdate = [
      {
        mappingProfile: {
          name: `C401727 Update ER holdings ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C401727 Update ER holdings ${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          name: `C401727 Update Call number holdings ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          callNumberType: '852$t',
          callNumberPrefix: '852$p',
          callNumber: '852$h',
          callNumberSuffix: '852$s',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C401727 Update Call number holdings ${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          name: `C401727 Update Electronic access holdings ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          relationship: '856$f',
          uri: '856$u',
          linkText: '856$y',
          materialsSpecified: '856$3',
          urlPublicNote: '856$z',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C401727 Update Electronic access holdings ${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
    ];
    const matchProfile = {
      profileName: `C401727 901 to Holdings HRID match ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '901',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
      holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
    };
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C401727 Update holdings with 901 match ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(holdingsActionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(holdingsMappingProfile.name);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        collectionOfMappingAndActionProfilesForUpdate.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C401727 Verify that 3 successive update actions for Holdings proceed without errors (folijet)',
      { tags: ['criticalPath', 'folijet', 'C401727'] },
      () => {
        // create field mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
        NewFieldMappingProfile.fillPermanentLocation(holdingsMappingProfile.permanentLocation);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(holdingsMappingProfile.name);

        // create action profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(holdingsActionProfile, holdingsMappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(holdingsActionProfile.name);

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfileByName('Default - Create instance');
        NewJobProfile.linkActionProfileByName(holdingsActionProfile.name);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for creating
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreate, marcFileNameForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileNameForCreate);
        Logs.checkJobStatus(marcFileNameForCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileNameForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        // get Instance hrid for deleting
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((hrId) => {
          instanceHrid = hrId;
        });
        InventoryInstance.openHoldingView();
        HoldingsRecordView.getHoldingsHrId().then((initialHrId) => {
          const holdingsHrId = initialHrId;

          // edit file with the copied value in the 901 field
          DataImport.editMarcFile(
            filePathForCreate,
            editedMarcFileName,
            ['ho00004554073'],
            [holdingsHrId],
          );
        });

        // create field mapping profiles for updating
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile,
        );
        NewFieldMappingProfile.fillHoldingsType(
          collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.holdingsType,
        );
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
        NewFieldMappingProfile.fillCallNumberType(
          collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.callNumberType,
        );
        NewFieldMappingProfile.fillCallNumberPrefix(
          collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.callNumberPrefix,
        );
        NewFieldMappingProfile.fillCallNumber(
          collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.callNumber,
        );
        NewFieldMappingProfile.fillcallNumberSuffix(
          collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.callNumberSuffix,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfilesForUpdate[1].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfilesForUpdate[2].mappingProfile,
        );
        NewFieldMappingProfile.addElectronicAccess(
          collectionOfMappingAndActionProfilesForUpdate[2].mappingProfile.typeValue,
          collectionOfMappingAndActionProfilesForUpdate[2].mappingProfile.relationship,
          collectionOfMappingAndActionProfilesForUpdate[2].mappingProfile.uri,
          collectionOfMappingAndActionProfilesForUpdate[2].mappingProfile.linkText,
          collectionOfMappingAndActionProfilesForUpdate[2].mappingProfile.materialsSpecified,
          collectionOfMappingAndActionProfilesForUpdate[2].mappingProfile.urlPublicNote,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfilesForUpdate[2].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfilesForUpdate[2].mappingProfile.name,
        );

        // create action profiles for updating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfMappingAndActionProfilesForUpdate.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create job profile for creating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfileForUpdate);
        NewJobProfile.linkMatchAndThreeActionProfiles(
          matchProfile.profileName,
          collectionOfMappingAndActionProfilesForUpdate[0].actionProfile.name,
          collectionOfMappingAndActionProfilesForUpdate[1].actionProfile.name,
          collectionOfMappingAndActionProfilesForUpdate[2].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

        // upload a marc file for creating
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, marcFileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileNameForUpdate);
        Logs.checkJobStatus(marcFileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileNameForUpdate);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.holdings,
        );
        FileDetails.openHoldingsInInventory(RECORD_STATUSES.UPDATED);

        HoldingsRecordView.checkHoldingsType(
          collectionOfMappingAndActionProfilesForUpdate[0].mappingProfile.holdingsType,
        );
        HoldingsRecordView.checkCallNumberType(callNumberData.callNumberType);
        HoldingsRecordView.checkCallNumberPrefix(callNumberData.callNumberPrefix);
        HoldingsRecordView.checkCallNumber(callNumberData.callNumber);
        HoldingsRecordView.checkCallNumberSuffix(callNumberData.callNumberSuffix);
        HoldingsRecordView.checkElectronicAccess(
          holdingsElectronicAccessData.urlRelationship,
          holdingsElectronicAccessData.uri,
          holdingsElectronicAccessData.linkTextUMass,
          '-',
          holdingsElectronicAccessData.urlPublicNote,
        );
      },
    );
  });
});
