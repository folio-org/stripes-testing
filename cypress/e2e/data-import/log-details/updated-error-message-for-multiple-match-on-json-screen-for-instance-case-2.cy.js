import { Permissions } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  EXISTING_RECORDS_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
} from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';

describe('data-import', () => {
  describe('Log details', () => {
    const testData = {
      createdRecordIDs: [],
      marcFilePath: 'marcBibFileForC389589.mrc',
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      fileName: `C389590 marcFileName${getRandomPostfix()}`,
      title: "101 things I wish I'd known when I started using hypnosis / Dabney Ewin.",
      errorMessage:
        'org.folio.processing.exceptions.MatchingException: Found multiple records matching specified conditions',
    };
    const matchProfile = {
      profileName: `C389590 Updating SRS by 035 to OCLC number${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '035',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.identifierOCLC,
    };
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          name: `C389590 Modifying 500 record${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
          modifications: {
            action: 'Add',
            field: '500',
            ind1: '',
            ind2: '',
            subfield: 'a',
            data: `Test.${getRandomPostfix()}`,
          },
        },
        actionProfile: {
          name: `C389590 Modifying 500 record${getRandomPostfix()}`,
          action: 'Modify (MARC Bibliographic record type only)',
          typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        },
      },
      {
        mappingProfile: {
          name: `C389590 Updating Instance with ADM note${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          adminNotes: 'Add this to existing',
          adminNote: `Test${getRandomPostfix()}`,
        },
        actionProfile: {
          name: `C389590 Updating Instance with ADM note${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C389589 Updating Instance by 035 OCLC record${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    const marcFileNames = [
      {
        fileName: `C389590 testMarcFile${getRandomPostfix()}.mrc`,
      },
      {
        fileName: `C389590 testMarcFile${getRandomPostfix()}.mrc`,
      },
      {
        fileName: `C389590 testMarcFile${getRandomPostfix()}.mrc`,
      },
      {
        fileName: `C389590 testMarcFile${getRandomPostfix()}.mrc`,
      },
      {
        fileName: `C389590 testMarcFile${getRandomPostfix()}.mrc`,
      },
    ];

    before('Create test data', () => {
      cy.getAdminToken();
      cy.loginAsAdmin();
      marcFileNames.forEach((name) => {
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.marcFilePath, name.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(testData.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(name.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(name.fileName);
        Logs.getCreatedItemsID().then((link) => {
          testData.createdRecordIDs.push(link.split('/')[5]);
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        JobProfiles.deleteJobProfile(jobProfile.profileName);
        MatchProfiles.deleteMatchProfile(matchProfile.profileName);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          ActionProfiles.deleteActionProfile(profile.actionProfile.name);
          FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
        });
        testData.createdRecordIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
      });
    });

    it(
      'C389590 Verify the updated error message for multiple match on JSON screen for Instance: Case 2 (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // craete match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.addFieldMappingsForMarc();
        NewFieldMappingProfile.fillModificationSectionWithAdd(
          collectionOfMappingAndActionProfiles[0].mappingProfile.modifications,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.addAdministrativeNote(
          collectionOfMappingAndActionProfiles[1].mappingProfile.adminNote,
          9,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        // create action profiles
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.marcFilePath, testData.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(testData.fileName);
        FileDetails.openJsonScreen(testData.title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.openInstanceTab();
        JsonScreenView.verifyContentInTab(testData.errorMessage);
      },
    );
  });
});
