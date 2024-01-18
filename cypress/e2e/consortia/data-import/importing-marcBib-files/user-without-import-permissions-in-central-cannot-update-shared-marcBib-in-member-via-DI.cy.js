import {
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
} from '../../../../support/constants';
import Affiliations from '../../../../support/dictionary/affiliations';
// , { tenantNames }
import Permissions from '../../../../support/dictionary/permissions';
// import ActionProfiles from '../../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
// import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
// import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
// import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
// import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
// import ExportFile from '../../../../support/fragments/data-export/exportFile';
import NewActionProfile from '../../../../support/fragments/data_import/action_profiles/newActionProfile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
// import FileManager from '../../../../support/utils/fileManager';
// import FieldMappingProfileView from '../../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
// import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
// import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
// import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
// import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
// import MatchProfiles from '../../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      instanceIds: [],
      marcFile: {
        marc: 'marcBibFileForC411791.mrc',
        fileName: `C411791 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        // exportedFileName: `C411791 exportedTestMarcFile${getRandomPostfix()}.mrc`,
        // marcFileForModify: 'marcBibFileForC405531_1.mrc',
        // modifiedMarcFile: `C405531 modifiedTestMarcFile${getRandomPostfix()}.mrc`,
      },
      // contributorName: 'Coates, Ta-Nehisi (C405531)',
      // contributorType: 'Translator',
      // absentContributorName: 'Stelfreeze, Brian (to be deleted)',
      // subjects: [
      //   { row: 0, column: 0, name: 'Black Panther (Fictitious character) C405531' },
      //   { row: 1, column: 0, name: 'New Subject C405531' },
      //   { row: 2, column: 0, name: 'Superfighters (C405531)' },
      // ],
      // instanceTitle: 'C405531 Instance Shared Central',
      // tag100: {
      //   tag: '100',
      //   content: '$a Coates, Ta-Nehisi (C405531) $e translator',
      // },
      // tag610: {
      //   tag: '610',
      //   content: '$a New Subject C405531',
      // },
      // tag650: {
      //   tag: '650',
      //   content: '$a Superfighters (C405531)',
      // },
      // tag700: {
      //   tag: '700',
      // },
    };
    const mappingProfile = {
      name: `C405531 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C405531 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const matchProfile = {
      profileName: `C405531 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      existingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      recordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfileName = `C405531 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
      DataImport.verifyUploadState();
      DataImport.uploadFileAndRetry(testData.marcFile.marc, testData.marcFile.fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(testData.marcFile.jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(testData.marcFile.fileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(testData.marcFile.fileName);
      Logs.getCreatedItemsID().then((link) => {
        testData.instanceIds.push(link.split('/')[5]);
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.dataExportEnableApp.gui,
      ])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.dataExportEnableApp.gui,
          ]);
          NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile).then(
            (mappingProfileResponse) => {
              NewActionProfile.createActionProfileViaApiMarc(
                actionProfile,
                mappingProfileResponse.body.id,
              ).then((actionProfileResponse) => {
                NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
                  matchProfile,
                ).then((matchProfileResponse) => {
                  NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                    jobProfileName,
                    matchProfileResponse.body.id,
                    actionProfileResponse.body.id,
                  );
                });
              });
            },
          );

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          cy.resetTenant();
        });
    });

    it(
      'C411791 User without import permissions in Central tenant cannot update Shared "MARC Bib" in member tenant via Data import (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {},
    );
  });
});
