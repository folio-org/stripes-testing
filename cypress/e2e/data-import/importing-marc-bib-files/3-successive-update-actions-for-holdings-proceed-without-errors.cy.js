import getRandomPostfix from '../../../support/utils/stringTools';
import { Permissions } from '../../../support/dictionary';
import {
  LOCATION_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
  HOLDINGS_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../support/fragments/settings/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Users from '../../../support/fragments/users/users';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import FileManager from '../../../support/utils/fileManager';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
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
    const marcFileNameForCreate = `C401727 autotestFileName ${getRandomPostfix()}`;
    const marcFileNameForUpdate = `C401727 autotestFileName ${getRandomPostfix()}`;
    const editedMarcFileName = `C401727 editedAutotestFileName ${getRandomPostfix()}`;
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
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
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
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
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
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
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
      existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
      holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
    };
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C401727 Update holdings with 901 match ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
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

    after('delete test data', () => {
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

      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
    });

    it(
      'C401727 Verify that 3 successive update actions for Holdings proceed without errors (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        // create field mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
        NewFieldMappingProfile.fillPermanentLocation(holdingsMappingProfile.permanentLocation);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(holdingsMappingProfile.name);

        // create action profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(holdingsActionProfile, holdingsMappingProfile.name);
        ActionProfiles.checkActionProfilePresented(holdingsActionProfile.name);

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfileByName('Default - Create instance');
        NewJobProfile.linkActionProfileByName(holdingsActionProfile.name);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload a marc file for creating
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreate, marcFileNameForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileNameForCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
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
        cy.go('back');
        FileDetails.openHoldingsInInventory(RECORD_STATUSES.CREATED);
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
        cy.visit(SettingsMenu.mappingProfilePath);
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
        collectionOfMappingAndActionProfilesForUpdate.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profiles
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create job profile for creating
        cy.visit(SettingsMenu.jobProfilePath);
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
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, marcFileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileNameForUpdate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
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
          holdingsElectronicAccessData.urlPublicNote,
        );
      },
    );
  });
});
